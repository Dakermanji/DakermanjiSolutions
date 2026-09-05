//! services/chat/messages/rateLimit.js

import {
	CHAT_CONVERSATION_TYPES,
	CHAT_MESSAGE_RATE_LIMITS,
} from '../../../constants/chat.js';
import { canChatMemberManage } from '../rooms/permissions.js';

const buckets = new Map();

export const MESSAGE_RATE_LIMIT_RESULT = Object.freeze({
	OK: 'ok',
	LIMITED: 'limited',
});

export function checkRoomMessageRateLimit({
	conversation,
	senderUserId,
	now = Date.now(),
} = {}) {
	if (!conversation || !senderUserId) {
		return rateLimitResult(MESSAGE_RATE_LIMIT_RESULT.OK);
	}

	if (conversation.conversation_type !== CHAT_CONVERSATION_TYPES.PUBLIC_ROOM) {
		return rateLimitResult(MESSAGE_RATE_LIMIT_RESULT.OK);
	}

	if (canChatMemberManage(conversation.member_role, conversation.member_status)) {
		return rateLimitResult(MESSAGE_RATE_LIMIT_RESULT.OK);
	}

	cleanupExpiredBuckets(now);

	const limit = getRoomMessageRateLimit(conversation, now);
	const bucketKey = `${conversation.conversation_id}:${senderUserId}`;
	const bucket = getActiveBucket(bucketKey, limit.windowMs, now);

	if (bucket.timestamps.length >= limit.maxMessages) {
		return rateLimitResult(MESSAGE_RATE_LIMIT_RESULT.LIMITED, {
			retryAfterMs: limit.windowMs - (now - bucket.timestamps[0]),
		});
	}

	bucket.timestamps.push(now);
	bucket.expiresAt = now + CHAT_MESSAGE_RATE_LIMITS.BUCKET_TTL_MS;
	buckets.set(bucketKey, bucket);

	return rateLimitResult(MESSAGE_RATE_LIMIT_RESULT.OK);
}

function getRoomMessageRateLimit(conversation, now) {
	const joinedAt = Date.parse(conversation.member_joined_at || '');
	const isNewMember =
		Number.isFinite(joinedAt) &&
		now - joinedAt < CHAT_MESSAGE_RATE_LIMITS.NEW_PUBLIC_ROOM_MEMBER_AGE_MS;

	if (isNewMember) {
		return {
			windowMs: CHAT_MESSAGE_RATE_LIMITS.NEW_PUBLIC_ROOM_MEMBER_WINDOW_MS,
			maxMessages: CHAT_MESSAGE_RATE_LIMITS.NEW_PUBLIC_ROOM_MEMBER_MAX_MESSAGES,
		};
	}

	return {
		windowMs: CHAT_MESSAGE_RATE_LIMITS.PUBLIC_ROOM_WINDOW_MS,
		maxMessages: CHAT_MESSAGE_RATE_LIMITS.PUBLIC_ROOM_MAX_MESSAGES,
	};
}

function getActiveBucket(bucketKey, windowMs, now) {
	const bucket = buckets.get(bucketKey);

	if (!bucket) {
		return {
			timestamps: [],
			expiresAt: now + CHAT_MESSAGE_RATE_LIMITS.BUCKET_TTL_MS,
		};
	}

	bucket.timestamps = bucket.timestamps.filter(
		(timestamp) => now - timestamp < windowMs,
	);

	return bucket;
}

function cleanupExpiredBuckets(now) {
	for (const [bucketKey, bucket] of buckets.entries()) {
		if (bucket.expiresAt <= now) {
			buckets.delete(bucketKey);
		}
	}
}

function rateLimitResult(reason, details = {}) {
	return {
		ok: reason === MESSAGE_RATE_LIMIT_RESULT.OK,
		reason,
		...details,
	};
}