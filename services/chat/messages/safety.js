//! services/chat/messages/safety.js

import {
	CHAT_MESSAGE_MODERATION_REASONS,
	CHAT_MESSAGE_MODERATION_STATUSES,
	CHAT_MESSAGE_SAFETY,
} from '../../../constants/chat.js';
import { inspectProfanity } from '../../../middlewares/profanity/index.js';

const profanityReviewConversationTypes = new Set(
	CHAT_MESSAGE_SAFETY.PROFANITY_REVIEW_CONVERSATION_TYPES,
);

function getProfanitySignals(body) {
	const result = inspectProfanity(body);
	const signals = [];

	if (result.normalized) {
		signals.push('normalized');
	}

	if (result.collapsed) {
		signals.push('collapsed');
	}

	return signals.slice(0, CHAT_MESSAGE_SAFETY.PROFANITY_MATCH_SAMPLE_LIMIT);
}

export function shouldReviewMessageProfanity(conversationType) {
	return Boolean(CHAT_MESSAGE_SAFETY.PROFANITY_REVIEW_ENABLED) &&
		profanityReviewConversationTypes.has(conversationType);
}

export function checkMessageProfanity({ body, conversationType } = {}) {
	const signals = shouldReviewMessageProfanity(conversationType)
		? getProfanitySignals(body)
		: [];
	const shouldReview =
		signals.length >= CHAT_MESSAGE_SAFETY.PROFANITY_REVIEW_MATCH_THRESHOLD;

	return {
		shouldReview,
		reason: shouldReview
			? CHAT_MESSAGE_MODERATION_REASONS.PROFANITY
			: null,
		status: shouldReview
			? CHAT_MESSAGE_MODERATION_STATUSES.PENDING_REVIEW
			: CHAT_MESSAGE_MODERATION_STATUSES.VISIBLE,
		signals: Object.freeze(signals),
	};
}

export function getMessageSafetyDecision({ body, conversationType } = {}) {
	const profanity = checkMessageProfanity({ body, conversationType });

	return {
		allowed: true,
		shouldReview: profanity.shouldReview,
		moderationStatus: profanity.status,
		moderationReason: profanity.reason,
		metadata: Object.freeze({
			profanitySignals: profanity.signals,
		}),
	};
}