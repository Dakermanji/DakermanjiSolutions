//! services/auth/resetPassword.js

import UserModel from '../../models/User.js';
import AuthTokenModel from '../../models/auth/Token.js';
import { hashPassword } from './password.js';
import { verifyToken, tokenTypes } from './verifyToken.js';
import { logAuthEvent } from '../../config/passport/strategies/localSecurity.js';

/**
 * Reset a user's password using a valid password-reset token.
 *
 * Responsibilities:
 * - verify the raw reset token again on submission
 * - hash the new password securely
 * - update the user's stored password hash
 * - consume the reset token so it cannot be reused
 * - log the security event for auditing
 *
 * Notes:
 * - expects validated input
 * - expects token to be normalized already
 * - does not send any email
 * - throws when the token is invalid or the password update fails
 *
 * @param {Object} params
 * @param {string} params.token
 * @param {string} params.newPassword
 * @param {string | null} [params.ip]
 * @param {string | null} [params.userAgent]
 * @returns {Promise<{ ok: true, userId: string }>}
 */
export async function resetPassword({
	token,
	newPassword,
	ip = null,
	userAgent = null,
}) {
	// Re-check the token at submission time so expired/used links are rejected.
	const verified = await verifyToken(token, tokenTypes.passwordReset);

	if (!verified?.ok) {
		const error = new Error('Invalid or expired reset-password token.');
		error.code = 'RESET_PASSWORD_INVALID_TOKEN';
		throw error;
	}

	const { userId, tokenHash } = verified;

	// Hash the new password before storing it.
	const hashedPassword = await hashPassword(newPassword);

	// Update the user password in the database.
	const updatedUser = await UserModel.updatePasswordById(
		userId,
		hashedPassword,
	);

	if (!updatedUser) {
		const error = new Error('Failed to update password.');
		error.code = 'RESET_PASSWORD_UPDATE_FAILED';
		throw error;
	}

	// Consume the token only after the password was changed successfully.
	const used = await AuthTokenModel.markTokenUsed(
		tokenHash,
		tokenTypes.passwordReset,
		userId,
	);

	if (!used) {
		const error = new Error('Failed to consume reset-password token.');
		error.code = 'RESET_PASSWORD_TOKEN_CONSUME_FAILED';
		throw error;
	}

	// Record the successful password reset for security auditing.
	await logAuthEvent({
		userId,
		eventType: 'password_reset_success',
		ipAddress: ip,
		userAgent,
	});

	return {
		ok: true,
		userId,
	};
}

export default {
	resetPassword,
};
