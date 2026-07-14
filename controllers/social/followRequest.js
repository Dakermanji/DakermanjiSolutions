//! controllers/social/followRequest.js

import UserModel from '../../models/User.js';
import UserBlocksModel from '../../models/social/Blocks.js';
import UserFollowsModel from '../../models/social/Follows.js';
import UserFollowRequestsModel from '../../models/social/FollowRequests.js';
import UserSocialNotificationsModel from '../../models/social/Notifications.js';
import { ensureFriendConversationIfMutual } from '../../services/chat/friends.js';
import { emitSocialCountsChanged } from '../../services/social/live.js';
import { fail, success } from '../../services/http/response.js';

const GENERIC_SUCCESS_KEY = 'social:followRequest.success';
const FOLLOWING_NOW_SUCCESS_KEY = 'social:followRequest.following_now';
const ERROR_PREFIX = 'social:error.';

/**
 * Handle follow request creation.
 *
 * Responsibilities:
 * - resolve identifier to target user
 * - protect privacy with generic success where needed
 * - enforce self/block/follow/request rules
 * - create follow request
 * - create social notification
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function followRequest(req, res, next) {
	const senderId = req.user?.id;
	const { identifier, identifierType, returnTo } = req.body;

	try {
		// 1. sender is a registered user
		if (!senderId)
			return fail(req, res, 'auth:error.auth_required', { to: returnTo });

		// 2. Resolve target user
		const targetUser =
			identifierType === 'email'
				? await UserModel.findByEmailBasic(identifier)
				: await UserModel.findByUsername(identifier);

		// 3. Target exists
		if (!targetUser) {
			return success(req, res, GENERIC_SUCCESS_KEY, {
				modal: 'social',
				to: returnTo,
			});
		}

		const receiverId = targetUser.id;

		// 4. Self-check
		if (senderId === receiverId) {
			return fail(req, res, `${ERROR_PREFIX}cannot_follow_self`, {
				modal: 'social',
				to: returnTo,
			});
		}

		// 5. Sender blocked receiver
		const senderBlockedReceiver = await UserBlocksModel.exists(
			senderId,
			receiverId,
		);
		if (senderBlockedReceiver) {
			return fail(req, res, `${ERROR_PREFIX}you_blocked_this_user`, {
				modal: 'social',
				to: returnTo,
			});
		}

		// 6. Receiver blocked sender
		const receiverBlockedSender = await UserBlocksModel.exists(
			receiverId,
			senderId,
		);
		if (receiverBlockedSender) {
			return success(req, res, GENERIC_SUCCESS_KEY, {
				modal: 'social',
				to: returnTo,
			});
		}

		// 7. Already following
		const alreadyFollowing = await UserFollowsModel.exists(
			senderId,
			receiverId,
		);
		if (alreadyFollowing) {
			return fail(req, res, `${ERROR_PREFIX}already_following`, {
				modal: 'social',
				to: returnTo,
			});
		}

		// 8. Existing pending request by sender
		const senderPendingRequest = await UserFollowRequestsModel.findPending(
			senderId,
			receiverId,
		);
		if (senderPendingRequest) {
			await UserSocialNotificationsModel.ensureFollowRequestNotification({
				recipientId: receiverId,
				actorId: senderId,
				followRequestId: senderPendingRequest.id,
			});

			emitSocialCountsChanged([receiverId]);

			return success(req, res, GENERIC_SUCCESS_KEY, {
				modal: 'social',
				to: returnTo,
			});
		}

		// 9. Existing pending request by receiver -> accept it and follow back
		const receiverPendingRequest =
			await UserFollowRequestsModel.findPending(receiverId, senderId);
		if (receiverPendingRequest) {
			const accepted = await UserFollowRequestsModel.accept(
				receiverPendingRequest.id,
				senderId,
			);
			if (!accepted) {
				throw new Error(
					'Could not accept reverse pending follow request',
				);
			}

			await UserFollowsModel.create(receiverId, senderId);
			await UserFollowsModel.create(senderId, receiverId);
			await ensureFriendConversationIfMutual(senderId, receiverId);
			await UserSocialNotificationsModel.markFollowRequestNotificationsAsReadAndHandled(
				receiverPendingRequest.id,
				senderId,
			);

			await UserSocialNotificationsModel.create({
				recipientId: receiverId,
				actorId: senderId,
				type: 'follow_request_accepted_followed_back',
				followRequestId: receiverPendingRequest.id,
			});

			emitSocialCountsChanged([senderId, receiverId]);

			return success(req, res, FOLLOWING_NOW_SUCCESS_KEY, {
				modal: 'social',
				to: returnTo,
			});
		}

		// 10. Receiver already follows sender -> follow immediately
		const receiverAlreadyFollowingSender = await UserFollowsModel.exists(
			receiverId,
			senderId,
		);
		if (receiverAlreadyFollowingSender) {
			await UserFollowsModel.create(senderId, receiverId);
			await ensureFriendConversationIfMutual(senderId, receiverId);

			await UserSocialNotificationsModel.create({
				recipientId: receiverId,
				actorId: senderId,
				type: 'follow_started',
			});

			emitSocialCountsChanged([senderId, receiverId]);

			return success(req, res, FOLLOWING_NOW_SUCCESS_KEY, {
				modal: 'social',
				to: returnTo,
			});
		}

		// 11. Create follow request
		const followRequest = await UserFollowRequestsModel.create({
			requesterId: senderId,
			targetId: receiverId,
		});
		if (!followRequest) {
			throw new Error('Could not create follow request');
		}

		// 12. Create social notification
		const notification = await UserSocialNotificationsModel.create({
			recipientId: receiverId,
			actorId: senderId,
			type: 'follow_request',
			followRequestId: followRequest.id,
		});
		if (!notification) {
			throw new Error('Could not create follow request notification');
		}

		emitSocialCountsChanged([senderId, receiverId]);

		// 13. Success
		return success(req, res, GENERIC_SUCCESS_KEY, {
			modal: 'social',
			to: returnTo,
		});
	} catch (error) {
		next(error);
	}
}
