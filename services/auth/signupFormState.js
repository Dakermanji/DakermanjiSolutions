//! services/auth/signupFormState.js

import { isSupportedAvatarValue } from '../avatar/dicebear.js';
import { isSupportedCountryCode } from '../country/list.js';
import { MAX_AVATAR_SEED_LENGTH } from '../../constants/auth/validation.js';
import { MAX_IDENTIFIER_LENGTH } from '../../constants/common.js';

export function rememberSignupForm(req) {
	const username =
		typeof req.body?.username === 'string'
			? req.body.username.trim().slice(0, MAX_IDENTIFIER_LENGTH)
			: '';
	const avatarValue =
		typeof req.body?.avatarSeed === 'string'
			? req.body.avatarSeed.trim()
			: '';
	const avatarSeed =
		avatarValue.length <= MAX_AVATAR_SEED_LENGTH &&
		isSupportedAvatarValue(avatarValue)
			? avatarValue
			: '';
	const countryValue =
		typeof req.body?.countryCode === 'string'
			? req.body.countryCode.trim().toUpperCase()
			: '';
	const countryCode = isSupportedCountryCode(countryValue) ? countryValue : '';

	req.flash('signupForm', { username, avatarSeed, countryCode });
}
