//! services/chat/rooms/members.js

import ChatRoomsModel from '../../../models/chat/Rooms.js';
import { getUserAvatarProfile } from '../../avatar/dicebear.js';
import { findOpenableRoomConversation } from './access.js';
import { canChatMemberManage } from './permissions.js';

function formatRoomMember(member) {
	const displayName =
		member.username ||
		member.email ||
		'User';
	const avatar = getUserAvatarProfile(member.avatar_seed || displayName);

	return {
		id: member.user_id,
		conversationId: member.conversation_id,
		role: member.role,
		status: member.status,
		joinedAt: member.joined_at,
		lastReadMessageId: member.last_read_message_id,
		username: member.username,
		email: member.email,
		displayName,
		countryCode: member.country_code,
		social: {
			isFollowing: Boolean(member.viewer_follows_member),
			isFollower: Boolean(member.member_follows_viewer),
			hasPendingFollowRequest: Boolean(
				member.viewer_pending_follow_request,
			),
			hasPendingIncomingFollowRequest: Boolean(
				member.member_pending_follow_request,
			),
			isBlocked: Boolean(member.viewer_blocked_member),
			isBlocking: Boolean(member.member_blocked_viewer),
		},
		avatar: {
			src: avatar.src,
			background: avatar.background,
		},
	};
}

/**
 * List readable room members if the viewer can open the room.
 *
 * @param {string} conversationId
 * @param {string} viewerUserId
 * @returns {Promise<Array>}
 */
export async function listRoomMembers(conversationId, viewerUserId) {
	const room = await findOpenableRoomConversation(
		conversationId,
		viewerUserId,
	);

	if (!room) {
		return [];
	}

	const members = await ChatRoomsModel.findRoomConversationMembers(
		room.conversation_id,
		viewerUserId,
	);

	return members.map(formatRoomMember);
}

/**
 * List room members for the owner/admin management panel.
 *
 * @param {string} conversationId
 * @param {string} viewerUserId
 * @returns {Promise<Array>}
 */
export async function listRoomManagementMembers(conversationId, viewerUserId) {
	const room = await findOpenableRoomConversation(
		conversationId,
		viewerUserId,
	);

	if (
		!room ||
		!canChatMemberManage(room.member_role, room.member_status)
	) {
		return [];
	}

	const members = await ChatRoomsModel.findRoomConversationManagementMembers(
		room.conversation_id,
		viewerUserId,
	);

	return members.map(formatRoomMember);
}
