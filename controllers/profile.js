//! controllers/profile.js

import UserModel from '../models/User.js';
import { buildAccountOverview } from '../services/profile/account.js';
import {
	getDeletionPhrase,
	sendAccountDeletionConfirmation,
} from '../services/profile/deletion.js';
import { buildProfilePreferences } from '../services/profile/preferences.js';
import {
	createAvatarStyleOptions,
	isSupportedAvatarValue,
} from '../services/avatar/dicebear.js';
import {
	getCountryOptions,
	isSupportedCountryCode,
} from '../services/country/list.js';
import { getLocale } from '../services/i18n/locale.js';
import { fail, success } from '../services/http/response.js';
import {
	isValidPassword,
	isValidUsername,
	normalizeText,
} from '../middlewares/validators/common.js';
import { validateNoProfanity } from '../middlewares/profanity/index.js';
import { comparePassword, hashPassword } from '../services/auth/password.js';
import { sendPasswordChangedEmail } from '../services/auth/email.js';
import logger from '../config/logger.js';

const PROFILE_REDIRECT = '/profile';
const MAX_AVATAR_VALUE_LENGTH = 96;

/**
 * Render the account profile shell.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {void}
 */
export function renderProfile(req, res) {
	res.render('profile/main', {
		styles: ['modals/main', 'profile/main'],
		scripts: ['profile/account', 'profile/avatar'],
		titleKey: 'layout:nav.profile',
		account: buildAccountOverview(req),
		preferences: buildProfilePreferences(req),
	});
}

export function renderAvatarModal(req, res) {
	return res.render('modals/profile/_avatar_modal', {
		layout: false,
		account: buildAccountOverview(req),
		avatarStyleOptions: createAvatarStyleOptions(24),
	});
}

export function renderCountryEditor(req, res) {
	return res.render('profile/_country_editor', {
		layout: false,
		account: buildAccountOverview(req),
		countryOptions: getCountryOptions(getLocale(req)),
	});
}

export function renderPasswordModal(req, res) {
	return res.render('modals/profile/_password_modal', {
		layout: false,
		account: buildAccountOverview(req),
	});
}

export async function requestAccountDeletion(req, res) {
	const expectedPhrase = getDeletionPhrase(req.user.username);
	const submittedPhrase = String(req.body?.deleteConfirmation || '').trim();
	const modal = 'profile_delete_account';

	if (submittedPhrase !== expectedPhrase) {
		return fail(req, res, 'profile:error.deleteAccountPhrase', {
			modal,
			to: PROFILE_REDIRECT,
		});
	}

	await sendAccountDeletionConfirmation({
		user: req.user,
		locale: getLocale(req),
	});

	return success(req, res, 'profile:danger.emailSent', {
		to: PROFILE_REDIRECT,
	});
}

export async function updateAvatar(req, res) {
	const avatarSeed = String(req.body?.avatarSeed || '').trim();

	if (
		!avatarSeed ||
		avatarSeed.length > MAX_AVATAR_VALUE_LENGTH ||
		!isSupportedAvatarValue(avatarSeed)
	) {
		return fail(req, res, 'auth:error.avatar_seed_invalid', {
			to: PROFILE_REDIRECT,
		});
	}

	const user = await UserModel.updateAvatarById(req.user.id, avatarSeed);

	if (!user) {
		return fail(req, res, 'common:error.generic', {
			to: PROFILE_REDIRECT,
		});
	}

	req.user.avatar_seed = user.avatar_seed;

	return success(req, res, 'common:avatarUpdated', {
		to: PROFILE_REDIRECT,
	});
}

export async function updateCountry(req, res) {
	const countryCode =
		normalizeText(req.body?.countryCode).toUpperCase() || null;

	if (countryCode && !isSupportedCountryCode(countryCode)) {
		return fail(req, res, 'auth:error.country_invalid', {
			to: PROFILE_REDIRECT,
		});
	}

	const user = await UserModel.updateCountryById(req.user.id, countryCode);

	if (!user) {
		return fail(req, res, 'common:error.generic', {
			to: PROFILE_REDIRECT,
		});
	}

	req.user.country_code = user.country_code;

	return success(req, res, 'common:countryUpdated', {
		to: PROFILE_REDIRECT,
	});
}

export async function updateUsername(req, res) {
	const username = normalizeText(req.body?.username);

	if (!isValidUsername(username)) {
		return fail(req, res, 'auth:error.username_invalid', {
			to: PROFILE_REDIRECT,
		});
	}

	if (!validateNoProfanity(username)) {
		return fail(req, res, 'auth:error.username_profanity', {
			to: PROFILE_REDIRECT,
		});
	}

	if (username === req.user.username) {
		return res.redirect(PROFILE_REDIRECT);
	}

	const usernameTaken = await UserModel.usernameExists(username);

	if (usernameTaken) {
		return fail(req, res, 'auth:error.username_taken', {
			to: PROFILE_REDIRECT,
		});
	}

	const result = await UserModel.updateUsernameById(req.user.id, username);

	if (!result.success) {
		return fail(req, res, result.reason || 'common:error.generic', {
			to: PROFILE_REDIRECT,
		});
	}

	req.user.username = username;

	return success(req, res, 'common:usernameUpdated', {
		to: PROFILE_REDIRECT,
	});
}

export async function updatePassword(req, res) {
	const hasPassword = Boolean(req.user?.has_password);
	const currentPassword = String(req.body?.currentPassword || '');
	const password = String(req.body?.password || '');
	const confirmPassword = String(req.body?.confirmPassword || '');
	const modal = 'profile_password';

	if (!isValidPassword(password)) {
		return fail(req, res, 'auth:error.password_weak', {
			modal,
			to: PROFILE_REDIRECT,
		});
	}

	if (password !== confirmPassword) {
		return fail(req, res, 'auth:error.password_mismatch', {
			modal,
			to: PROFILE_REDIRECT,
		});
	}

	if (hasPassword) {
		const userPassword = await UserModel.findPasswordById(req.user.id);
		const currentPasswordValid =
			userPassword?.hashed_password &&
			(await comparePassword(
				currentPassword,
				userPassword.hashed_password,
			));

		if (!currentPasswordValid) {
			return fail(req, res, 'profile:error.current_password_invalid', {
				modal,
				to: PROFILE_REDIRECT,
			});
		}

		if (await comparePassword(password, userPassword.hashed_password)) {
			return fail(req, res, 'profile:error.password_unchanged', {
				modal,
				to: PROFILE_REDIRECT,
			});
		}
	}

	const hashedPassword = await hashPassword(password);
	const user = await UserModel.updatePasswordById(
		req.user.id,
		hashedPassword,
	);

	if (!user) {
		return fail(req, res, 'common:error.generic', {
			modal,
			to: PROFILE_REDIRECT,
		});
	}

	req.user.has_password = true;

	try {
		await sendPasswordChangedEmail(user.email);
	} catch (error) {
		logger.error('Password changed, but security email failed', {
			type: 'mail',
			userId: user.id,
			err: error.message,
		});
	}

	return success(req, res, 'profile:password.updated', {
		to: PROFILE_REDIRECT,
	});
}
