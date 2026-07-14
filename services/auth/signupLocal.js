//! services/auth/signupLocal.js

import UserModel from '../../models/User.js';
import AuthTokenModel from '../../models/auth/Token.js';
import { sendSignupEmail } from './email.js';
import tokens from './tokens.js';
import { tokenTypes } from './verifyToken.js';

/**
 * Create pending local signup user and send signup email.
 *
 * Responsibilities:
 * - create pending local user
 * - generate signup token
 * - persist token hash
 * - send signup email
 *
 * Notes:
 * - expects validated and normalized email
 * - expects locale to already be resolved
 * - this only handles signup step 1
 *
 * @param {{
 *   email: string,
 *   locale: string
 * }} params
 * @returns {Promise<{
 *   id: string,
 *   email: string,
 *   locale: string,
 *   is_verified: boolean,
 *   created_at: Date
 * }>}
 */
export async function createPendingSignupAndSendEmail({ email, locale }) {
	const user = await UserModel.createLocalPendingUser(email, locale);

	const rawToken = tokens.createAuthToken();
	const tokenHash = tokens.hashAuthToken(rawToken);
	const expiresAt = new Date(Date.now() + tokens.AUTH_EXPIRY_TIME);

	await AuthTokenModel.createToken(
		user.id,
		tokenHash,
		expiresAt,
		tokenTypes.signup,
	);

	await sendSignupEmail(user.email, rawToken, user.locale);

	return user;
}
