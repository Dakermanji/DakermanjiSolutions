//! middlewares/validators/chat.js

import {
	CHAT_ROOM_LIMITS,
	CHAT_ROOM_VISIBILITY,
} from '../../constants/chat.js';
import { normalizeText } from './common.js';

const { DESCRIPTION_MAX_LENGTH, NAME_MAX_LENGTH } = CHAT_ROOM_LIMITS;
const VALID_ROOM_VISIBILITIES = new Set(Object.values(CHAT_ROOM_VISIBILITY));

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

/**
 * Normalize and validate room creation input.
 *
 * @param {object} input
 * @param {string} input.ownerUserId
 * @param {string} input.name
 * @param {string|null} input.description
 * @param {string} input.visibility
 * @returns {object}
 */
export function validateCreateRoomInput({
	ownerUserId,
	name,
	description,
	visibility,
}) {
	const normalizedName = normalizeRoomName(name);
	const normalizedDescription = normalizeRoomDescription(description);
	const normalizedVisibility = normalizeRoomVisibility(visibility);
	const errors = {};

	if (!ownerUserId) {
		errors.ownerUserId = 'Owner user is required.';
	}

	if (!normalizedName) {
		errors.name = 'Room name is required.';
	} else if (normalizedName.length > NAME_MAX_LENGTH) {
		errors.name = `Room name must be ${NAME_MAX_LENGTH} characters or less.`;
	}

	if (
		normalizedDescription &&
		normalizedDescription.length > DESCRIPTION_MAX_LENGTH
	) {
		errors.description =
			`Room description must be ${DESCRIPTION_MAX_LENGTH} characters or less.`;
	}

	if (!VALID_ROOM_VISIBILITIES.has(normalizedVisibility)) {
		errors.visibility = 'Room visibility is invalid.';
	}

	return {
		errors,
		isValid: Object.keys(errors).length === 0,
		values: {
			ownerUserId,
			name: normalizedName,
			description: normalizedDescription,
			visibility: normalizedVisibility,
		},
	};
}
