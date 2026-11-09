//! services/auth/signupFormState.js

import { isSupportedAvatarValue } from '../avatar/dicebear.js';
import { isSupportedCountryCode } from '../country/list.js';

export function rememberSignupForm(req) {
	const username =
		typeof req.body?.username === 'string'
			? req.body.username.trim().slice(0, 254)
			: '';
	const avatarValue =
		typeof req.body?.avatarSeed === 'string'
			? req.body.avatarSeed.trim()
			: '';
	const avatarSeed =
		avatarValue.length <= 96 && isSupportedAvatarValue(avatarValue)
			? avatarValue
			: '';
	const countryValue =
		typeof req.body?.countryCode === 'string'
			? req.body.countryCode.trim().toUpperCase()
			: '';
	const countryCode = isSupportedCountryCode(countryValue) ? countryValue : '';

	req.flash('signupForm', { username, avatarSeed, countryCode });
}
