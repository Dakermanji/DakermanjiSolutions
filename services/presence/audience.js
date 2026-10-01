//! services/presence/audience.js

import UserFollowsModel from '../../models/social/Follows.js';
import { getOpenFriendConversation, listFriendConversations } from '../chat/friends.js';
import { findOpenableRoomConversation } from '../chat/rooms/access.js';
import { listRoomMembers, listRoomManagementMembers } from '../chat/rooms/members.js';
import { canChatMemberManage } from '../chat/rooms/permissions.js';
import { isValidUuid } from '../../middlewares/validators/common.js';

export async function resolvePresenceAudience(viewerId, scope, conversationId) {
	if (scope === 'social-followers') {
		return (await UserFollowsModel.findFollowersByFollowee(viewerId))
			.map((member) => member.follower_id);
	}
	if (scope === 'social-followees') {
		return (await UserFollowsModel.findFolloweesByFollower(viewerId))
			.map((member) => member.followee_id);
	}
	if (scope === 'chat-friends') {
		return (await listFriendConversations(viewerId)).map((item) => item.friend.id);
	}
	if (scope === 'chat-friend' && isValidUuid(conversationId)) {
		const conversation = await getOpenFriendConversation(conversationId, viewerId);
		return conversation ? [conversation.friend.id] : null;
	}
	if (scope === 'room-members' && isValidUuid(conversationId)) {
		const room = await findOpenableRoomConversation(conversationId, viewerId);
		if (!room) return null;
		const canManage = canChatMemberManage(room.member_role, room.member_status);
		const members = canManage
			? await listRoomManagementMembers(conversationId, viewerId)
			: await listRoomMembers(conversationId, viewerId);
		return members
			.filter((member) => !member.social.isBlocked && !member.social.isBlocking)
			.map((member) => member.id);
	}
	return null;
}
