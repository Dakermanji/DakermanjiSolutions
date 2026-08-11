//! services/chat/messages/pagination.js

import { formatMessage } from './formatters.js';
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

export function formatMessagePage(messages, viewerUserId, limit, kind) {
	const hasMore = messages.length > limit;
	const pageMessages = hasMore ? messages.slice(1) : messages;
	const permittedMessages = applyMutationPermissions(
		pageMessages,
		viewerUserId,
		kind,
	);

	return {
		hasMore,
		messages: permittedMessages.map((message) =>
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
