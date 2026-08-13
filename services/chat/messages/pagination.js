//! services/chat/messages/pagination.js

import ChatMessagesModel from '../../../models/chat/Messages.js';
import {
	formatMessage,
	formatMessageReactionSummary,
} from './formatters.js';
import { getMutationWindowMs } from './utils.js';

function getMessageAgeMs(message) {
	const createdAt = new Date(message.created_at || message.createdAt);
	if (Number.isNaN(createdAt.getTime())) return Number.POSITIVE_INFINITY;

	return Date.now() - createdAt.getTime();
}

function applyMutationPermissions(messages, viewerUserId, kind) {
	const mutationWindowMs = getMutationWindowMs(kind);

	return messages.map((message) => {
		const isMine = message.sender_user_id === viewerUserId;
		const pendingFlagCount = Number(message.pending_flag_count || 0);
		const isInsideWindow = getMessageAgeMs(message) <= mutationWindowMs;
		const canMutate = isMine && pendingFlagCount === 0 && isInsideWindow;

		return {
			...message,
			can_edit: canMutate,
			can_delete: canMutate,
		};
	});
}

async function attachReactionSummaries(messages, viewerUserId) {
	const messageIds = messages.map((message) => message.id).filter(Boolean);

	if (messageIds.length === 0) {
		return messages;
	}

	const reactions = await ChatMessagesModel.listMessageReactions({
		messageIds,
		viewerUserId,
	});
	const reactionsByMessageId = new Map();

	for (const reaction of reactions) {
		const messageReactions =
			reactionsByMessageId.get(reaction.message_id) || [];

		messageReactions.push(reaction);
		reactionsByMessageId.set(reaction.message_id, messageReactions);
	}

	return messages.map((message) => ({
		...message,
		reactions: formatMessageReactionSummary({
			messageId: message.id,
			reactions: reactionsByMessageId.get(message.id) || [],
			viewerUserId,
		}).reactions,
	}));
}

export async function formatMessagePage(messages, viewerUserId, limit, kind) {
	const hasMore = messages.length > limit;
	const pageMessages = hasMore ? messages.slice(1) : messages;
	const permittedMessages = applyMutationPermissions(
		pageMessages,
		viewerUserId,
		kind,
	);
	const messagesWithReactions = await attachReactionSummaries(
		permittedMessages,
		viewerUserId,
	);

	return {
		hasMore,
		messages: messagesWithReactions.map((message) =>
			formatMessage(message, viewerUserId),
		),
	};
}

export function emptyMessagePage() {
	return {
		hasMore: false,
		messages: [],
	};
}
