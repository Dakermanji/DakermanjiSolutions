//! controllers/auth/setUsername.js

import { fail, success } from '../../services/http/response.js';
import UserModel from '../../models/User.js';
import { LEGAL_DOCUMENT_VERSIONS } from '../../constants/legal.js';

/**
 * Complete OAuth signup by assigning a unique username.
 *
 * Responsibilities:
 * - ensure username is still available
 * - persist username for the authenticated user
 * - return appropriate success or failure response
 *
 * Expected state:
 * - req.user is defined (validated by middleware)
 * - req.user.username is not set yet
 * - req.body.username is validated and normalized
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function setUsername(req, res, next) {
	try {
		const user = req.user;
		const username = req.body.username;
		const { avatarSeed, countryCode } = req.body;

		// check if username is already taken by another user
		const existingUser = await UserModel.usernameExists(username);

		if (existingUser)
			return fail(req, res, `auth:error.username_taken`, {
				modal: 'complete_signup_oauth',
			});

		// persist profile fields for current user
		const updateResult = await UserModel.completeOAuthSignupById(
			user.id,
			username,
			avatarSeed,
			countryCode,
			LEGAL_DOCUMENT_VERSIONS,
		);

		if (!updateResult.success)
			return fail(req, res, updateResult.reason, {
				modal: 'complete_signup_oauth',
			});

		Object.assign(req.user, updateResult.user);

		// notify success after completing OAuth signup
		return success(req, res, `auth:signup.completed`);
	} catch (error) {
		next(error);
	}
}
