//! middlewares/validators/auth/fields.js

import { isSafeString, normalizeText } from '../common.js';
import { isSupportedCountryCode } from '../../../services/country/list.js';
import { isSupportedAvatarValue } from '../../../services/avatar/dicebear.js';
import {
	AUTH_ERROR_PREFIX,
	MAX_AVATAR_SEED_LENGTH,
} from '../../../constants/auth/validation.js';

export function acceptedLegalDocuments(value) {
	return value === 'accepted';
}

export function normalizeOptionalAvatarSeed(value) {
	const avatarSeed = normalizeText(value);

	return avatarSeed || null;
}

export function normalizeOptionalCountryCode(value) {
	const countryCode = normalizeText(value).toUpperCase();

	return countryCode || null;
}

export function validateProfileFields({ avatarSeed, countryCode, errors }) {
	if (
		avatarSeed &&
		(!isSafeString(avatarSeed, MAX_AVATAR_SEED_LENGTH) ||
			!isSupportedAvatarValue(avatarSeed))
	) {
		errors.push(`${AUTH_ERROR_PREFIX}avatar_seed_invalid`);
	}

	if (countryCode && !isSupportedCountryCode(countryCode)) {
		errors.push(`${AUTH_ERROR_PREFIX}country_invalid`);
	}
}
