//! middlewares/validators/chat.js

import {
	CHAT_ROOM_LIMITS,
	CHAT_ROOM_VISIBILITY,
} from '../../constants/chat.js';
import { validateNoProfanity } from '../profanity/index.js';
import { isValidUuid, normalizeText } from './common.js';

const {
	DESCRIPTION_MAX_LENGTH,
	KEYWORD_MAX_COUNT,
	KEYWORD_MAX_LENGTH,
	KEYWORD_MIN_COUNT,
	NAME_MAX_LENGTH,
} = CHAT_ROOM_LIMITS;
const VALID_ROOM_VISIBILITIES = new Set(Object.values(CHAT_ROOM_VISIBILITY));
const PROFANITY_CHECKED_ROOM_VISIBILITIES = new Set([
	CHAT_ROOM_VISIBILITY.PUBLIC,
	CHAT_ROOM_VISIBILITY.PRIVATE_LISTED,
]);

function normalizeRoomName(name) {
	return normalizeText(name).replace(/\s+/g, ' ');
}

function normalizeRoomDescription(description) {
	const normalizedDescription = normalizeText(description);
	return normalizedDescription || null;
}

function normalizeRoomVisibility(visibility) {
	return normalizeText(visibility);
}

function normalizeRoomKeywords(keywords) {
	const keywordValues = Array.isArray(keywords)
		? keywords
		: String(keywords || '').split(/[,،]/);
	const normalizedKeywords = keywordValues
		.map((keyword) => normalizeText(keyword).replace(/\s+/g, ' ').toLowerCase())
		.filter(Boolean);

	return [...new Set(normalizedKeywords)];
}

function shouldCheckRoomProfanity(visibility) {
	return PROFANITY_CHECKED_ROOM_VISIBILITIES.has(visibility);
}

/**
 * Normalize and validate room create/update input.
 *
 * @param {object} input
 * @param {string} [input.ownerUserId]
 * @param {string} [input.actorUserId]
 * @param {string} [input.conversationId]
 * @param {string} input.name
 * @param {string|null} input.description
 * @param {string|Array<string>} input.keywords
 * @param {string} input.visibility
 * @param {boolean} requireOwnerUser
 * @param {boolean} requireActorUser
 * @param {boolean} requireConversation
 * @returns {object}
 */
function validateRoomInput({
	ownerUserId,
	actorUserId,
	conversationId,
	name,
	description,
	keywords,
	visibility,
}, {
	requireOwnerUser = false,
	requireActorUser = false,
	requireConversation = false,
} = {}) {
	const normalizedName = normalizeRoomName(name);
	const normalizedDescription = normalizeRoomDescription(description);
	const normalizedKeywords = normalizeRoomKeywords(keywords);
	const normalizedVisibility = normalizeRoomVisibility(visibility);
	const errors = {};

	if (requireOwnerUser && !isValidUuid(ownerUserId)) {
		errors.ownerUserId = 'Owner user is required.';
	}

	if (requireActorUser && !isValidUuid(actorUserId)) {
		errors.actorUserId = 'Actor user is required.';
	}

	if (requireConversation && !isValidUuid(conversationId)) {
		errors.conversationId = 'Conversation is required.';
	}

	if (!normalizedName) {
		errors.name = 'Room name is required.';
	} else if (normalizedName.length > NAME_MAX_LENGTH) {
		errors.name = `Room name must be ${NAME_MAX_LENGTH} characters or less.`;
	} else if (
		shouldCheckRoomProfanity(normalizedVisibility) &&
		!validateNoProfanity(normalizedName)
	) {
		errors.name = 'Room name contains inappropriate language.';
	}

	if (
		normalizedDescription &&
		normalizedDescription.length > DESCRIPTION_MAX_LENGTH
	) {
		errors.description =
			`Room description must be ${DESCRIPTION_MAX_LENGTH} characters or less.`;
	} else if (
		normalizedDescription &&
		shouldCheckRoomProfanity(normalizedVisibility) &&
		!validateNoProfanity(normalizedDescription)
	) {
		errors.description = 'Room description contains inappropriate language.';
	}

	if (normalizedKeywords.length < KEYWORD_MIN_COUNT) {
		errors.keywords = `Add at least ${KEYWORD_MIN_COUNT} room keyword.`;
	} else if (normalizedKeywords.length > KEYWORD_MAX_COUNT) {
		errors.keywords = `Use ${KEYWORD_MAX_COUNT} room keywords or less.`;
	} else {
		const oversizedKeyword = normalizedKeywords.find(
			(keyword) => keyword.length > KEYWORD_MAX_LENGTH,
		);
		const profaneKeyword = normalizedKeywords.find(
			(keyword) =>
				shouldCheckRoomProfanity(normalizedVisibility) &&
				!validateNoProfanity(keyword),
		);

		if (oversizedKeyword) {
			errors.keywords =
				`Each room keyword must be ${KEYWORD_MAX_LENGTH} characters or less.`;
		} else if (profaneKeyword) {
			errors.keywords = 'Room keywords contain inappropriate language.';
		}
	}

	if (!VALID_ROOM_VISIBILITIES.has(normalizedVisibility)) {
		errors.visibility = 'Room visibility is invalid.';
	}

	return {
		errors,
		isValid: Object.keys(errors).length === 0,
		values: {
			ownerUserId,
			actorUserId,
			conversationId,
			name: normalizedName,
			description: normalizedDescription,
			keywords: normalizedKeywords,
			visibility: normalizedVisibility,
		},
	};
}

/**
 * Normalize and validate room creation input.
 *
 * @param {object} input
 * @param {string} input.ownerUserId
 * @param {string} input.name
 * @param {string|null} input.description
 * @param {string|Array<string>} input.keywords
 * @param {string} input.visibility
 * @returns {object}
 */
export function validateCreateRoomInput(input) {
	return validateRoomInput(input, {
		requireOwnerUser: true,
	});
}

/**
 * Normalize and validate room update input.
 *
 * @param {object} input
 * @param {string} input.conversationId
 * @param {string} input.actorUserId
 * @param {string} input.name
 * @param {string|null} input.description
 * @param {string|Array<string>} input.keywords
 * @param {string} input.visibility
 * @returns {object}
 */
export function validateUpdateRoomInput(input) {
	return validateRoomInput(input, {
		requireActorUser: true,
		requireConversation: true,
	});
}
