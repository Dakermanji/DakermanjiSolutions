//! controllers/social/actionRunner.js

import UserBlocksModel from '../../models/social/Blocks.js';
import UserFollowRequestsModel from '../../models/social/FollowRequests.js';
import UserFollowsModel from '../../models/social/Follows.js';
import UserSocialNotificationsModel from '../../models/social/Notifications.js';
import { ensureFriendConversationIfMutual } from '../../services/chat/friends.js';
import {
	getFollowRequestActorId,
	getFollowRequestId,
	getPendingNotificationFollowRequestId,
	getTargetUserId,
	requireFollowRequestId,
	requireNotificationContext,
	requireTargetUserId,
} from './actionContext.js';

export const SOCIAL_ACTIONS = new Set([
	'accept_follow_request',
	'reject_follow_request',
	'follow_back',
	'block_user',
	'ignore_notification',
	'unfollow_user',
	'remove_follower',
	'remove_follow_relationships',
	'unblock_user',
	'unblock_and_follow_request',
]);

/**
 * Run one normalized social action.
 *
 * Responsibilities:
 * - resolve trusted identifiers from notification context when available
 * - apply the requested follow / block / notification side effects
 * - keep action-specific branching centralized
 *
 * Notes:
 * - notification-backed actions prefer server-owned context over client input
 * - some actions do not require notification context
 *
 * @param {{
 *   actorId: string,
 *   action: string,
 *   targetUserId: string | null,
 *   followRequestId: string | null,
 *   notificationId: string | null
 * }} params
 * @returns {Promise<void>}
 */
export async function runSocialAction(context) {
	const { actorId, action, targetUserId, notificationId } = context;

	if (action === 'accept_follow_request') {
		const effectiveTargetUserId = getFollowRequestActorId(context);
		const effectiveFollowRequestId = getFollowRequestId(context);

		await requireTargetUserId(effectiveTargetUserId);
		await requireFollowRequestId(effectiveFollowRequestId);

		if (
			await usersBlockedEitherDirection(actorId, effectiveTargetUserId)
		) {
			return;
		}

		const accepted = await UserFollowRequestsModel.accept(
			effectiveFollowRequestId,
			actorId,
		);
		if (!accepted) {
			if (notificationId) return;
			throw new Error('Follow request was not accepted');
		}

		await UserFollowsModel.create(effectiveTargetUserId, actorId);
		await ensureFriendConversationIfMutual(
			actorId,
			effectiveTargetUserId,
		);

		if (notificationId) {
			await markNotificationHandled(notificationId, actorId);
		}

		await UserSocialNotificationsModel.create({
			recipientId: effectiveTargetUserId,
			actorId,
			type: 'follow_request_accepted',
			followRequestId: effectiveFollowRequestId,
		});
		return;
	}

	if (action === 'follow_back') {
		const effectiveTargetUserId = getFollowRequestActorId(context);
		const effectiveFollowRequestId = getFollowRequestId(context);

		await requireTargetUserId(effectiveTargetUserId);

		if (effectiveFollowRequestId) {
			if (
				await usersBlockedEitherDirection(
					actorId,
					effectiveTargetUserId,
				)
			) {
				return;
			}

			const accepted = await UserFollowRequestsModel.accept(
				effectiveFollowRequestId,
				actorId,
			);
			if (!accepted) {
				if (notificationId) return;
				throw new Error('Follow request was not accepted');
			}
		}

		if (
			await usersBlockedEitherDirection(actorId, effectiveTargetUserId)
		) {
			return;
		}

		if (!effectiveFollowRequestId) {
			const targetStillFollowsActor = await UserFollowsModel.exists(
				effectiveTargetUserId,
				actorId,
			);
			if (!targetStillFollowsActor) return;
		}

		const followed = await UserFollowsModel.create(
			actorId,
			effectiveTargetUserId,
		);

		if (effectiveFollowRequestId) {
			await UserFollowsModel.create(effectiveTargetUserId, actorId);
		}

		await ensureFriendConversationIfMutual(
			actorId,
			effectiveTargetUserId,
		);

		if (notificationId) {
			await markNotificationHandled(notificationId, actorId);
		}

		if (effectiveFollowRequestId) {
			await UserSocialNotificationsModel.create({
				recipientId: effectiveTargetUserId,
				actorId,
				type: 'follow_request_accepted_followed_back',
				followRequestId: effectiveFollowRequestId,
			});
		} else if (followed) {
			await UserSocialNotificationsModel.create({
				recipientId: effectiveTargetUserId,
				actorId,
				type: 'follow_started',
			});
		}
		return;
	}

	if (action === 'reject_follow_request') {
		const effectiveFollowRequestId = getFollowRequestId(context);

		await requireFollowRequestId(effectiveFollowRequestId);

		const rejected = await UserFollowRequestsModel.reject(
			effectiveFollowRequestId,
			actorId,
		);
		if (!rejected) {
			if (notificationId) return;
			throw new Error('Follow request was not rejected');
		}

		if (notificationId) {
			await markNotificationHandled(notificationId, actorId);
		}
		return;
	}

	if (action === 'block_user') {
		const effectiveTargetUserId = getTargetUserId(context);
		const effectiveFollowRequestId =
			getPendingNotificationFollowRequestId(context);

		await requireTargetUserId(effectiveTargetUserId);

		// Reject the related request when block originates from a request-based
		// notification, then clear follow links in both directions.
		if (effectiveFollowRequestId) {
			await UserFollowRequestsModel.reject(
				effectiveFollowRequestId,
				actorId,
			);
		}

		await UserFollowsModel.removeBothDirections(
			actorId,
			effectiveTargetUserId,
		);
		await UserBlocksModel.create(actorId, effectiveTargetUserId);

		if (notificationId) {
			await markNotificationHandled(notificationId, actorId);
		}
		return;
	}

	if (action === 'ignore_notification') {
		await requireNotificationContext(context);
		await markNotificationHandled(notificationId, actorId);
		return;
	}

	if (action === 'unfollow_user') {
		await requireTargetUserId(targetUserId);
		const isFollowing = await UserFollowsModel.exists(
			actorId,
			targetUserId,
		);
		if (!isFollowing) return;

		await UserFollowsModel.removeOneDirection(actorId, targetUserId);
		return;
	}

	if (action === 'remove_follower') {
		await requireTargetUserId(targetUserId);
		const isFollower = await UserFollowsModel.exists(
			targetUserId,
			actorId,
		);
		if (!isFollower) return;

		await UserFollowsModel.removeOneDirection(targetUserId, actorId);
		return;
	}

	if (action === 'remove_follow_relationships') {
		await requireTargetUserId(targetUserId);
		const hasFollowRelationship =
			(await UserFollowsModel.exists(actorId, targetUserId)) ||
			(await UserFollowsModel.exists(targetUserId, actorId));
		if (!hasFollowRelationship) return;

		await UserFollowsModel.removeBothDirections(actorId, targetUserId);
		return;
	}

	if (action === 'unblock_user') {
		await requireTargetUserId(targetUserId);
		const unblocked = await UserBlocksModel.remove(actorId, targetUserId);
		if (!unblocked) return;
		return;
	}

	if (action === 'unblock_and_follow_request') {
		await requireTargetUserId(targetUserId);
		const unblocked = await UserBlocksModel.remove(actorId, targetUserId);
		if (!unblocked) return;
		await requestFollowAfterUnblock(actorId, targetUserId);
		return;
	}
}

async function usersBlockedEitherDirection(userAId, userBId) {
	const userABlockedUserB = await UserBlocksModel.exists(userAId, userBId);
	if (userABlockedUserB) return true;

	return UserBlocksModel.exists(userBId, userAId);
}

/**
 * Request or create a follow after removing a block.
 *
 * @param {string} requesterId
 * @param {string} targetId
 * @returns {Promise<void>}
 */
async function requestFollowAfterUnblock(requesterId, targetId) {
	const targetBlockedRequester = await UserBlocksModel.exists(
		targetId,
		requesterId,
	);
	if (targetBlockedRequester) return;

	const alreadyFollowing = await UserFollowsModel.exists(
		requesterId,
		targetId,
	);
	if (alreadyFollowing) return;

	const requesterPendingRequest = await UserFollowRequestsModel.findPending(
		requesterId,
		targetId,
	);
	if (requesterPendingRequest) return;

	const targetPendingRequest = await UserFollowRequestsModel.findPending(
		targetId,
		requesterId,
	);
	if (targetPendingRequest) {
		const accepted = await UserFollowRequestsModel.accept(
			targetPendingRequest.id,
			requesterId,
		);
		if (!accepted) return;

		await UserFollowsModel.create(targetId, requesterId);
		await UserFollowsModel.create(requesterId, targetId);
		await ensureFriendConversationIfMutual(requesterId, targetId);
		await UserSocialNotificationsModel.markFollowRequestNotificationsAsReadAndHandled(
			targetPendingRequest.id,
			requesterId,
		);

		await UserSocialNotificationsModel.create({
			recipientId: targetId,
			actorId: requesterId,
			type: 'follow_request_accepted_followed_back',
			followRequestId: targetPendingRequest.id,
		});
		return;
	}

	const targetAlreadyFollowingRequester = await UserFollowsModel.exists(
		targetId,
		requesterId,
	);
	if (targetAlreadyFollowingRequester) {
		const followed = await UserFollowsModel.create(requesterId, targetId);
		await ensureFriendConversationIfMutual(requesterId, targetId);
		if (followed) {
			await UserSocialNotificationsModel.create({
				recipientId: targetId,
				actorId: requesterId,
				type: 'follow_started',
			});
		}
		return;
	}

	if (await usersBlockedEitherDirection(requesterId, targetId)) return;

	const followRequest = await UserFollowRequestsModel.create({
		requesterId,
		targetId,
	});
	if (!followRequest) return;

	await UserSocialNotificationsModel.create({
		recipientId: targetId,
		actorId: requesterId,
		type: 'follow_request',
		followRequestId: followRequest.id,
	});
}

/**
 * Mark a notification as read and handled.
 *
 * Responsibilities:
 * - update read state
 * - update handled state
 * - keep notification completion logic centralized
 *
 * @param {string | null} notificationId
 * @param {string} recipientId
 * @returns {Promise<void>}
 */
async function markNotificationHandled(notificationId, recipientId) {
	const updated = await UserSocialNotificationsModel.markAsReadAndHandled(
		notificationId,
		recipientId,
	);

	if (!updated) {
		throw new Error('Notification could not be marked as handled');
	}
}
