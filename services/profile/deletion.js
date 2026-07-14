//! services/profile/deletion.js

import AuthTokenModel from '../../models/auth/Token.js';
import UserModel from '../../models/User.js';
import {
	ACCOUNT_DELETION_EXPIRY_TIME,
	prepareRecoveryToken,
} from '../auth/tokens.js';
import { sendAccountDeletionEmail } from '../auth/email.js';
import { tokenTypes, verifyToken } from '../auth/verifyToken.js';

export function getDeletionPhrase(username) {
	return `delete_${username}`;
}

export async function sendAccountDeletionConfirmation({ user, locale }) {
	const { token } = await prepareRecoveryToken({
		userId: user.id,
		type: tokenTypes.accountDeletion,
		expiresIn: ACCOUNT_DELETION_EXPIRY_TIME,
	});

	await sendAccountDeletionEmail({
		email: user.email,
		token,
		locale,
	});
}

export async function confirmAccountDeletion(token) {
	const verified = await verifyToken(token, tokenTypes.accountDeletion);

	if (!verified.ok) {
		return {
			success: false,
			reason: 'profile:error.deleteAccountInvalidLink',
		};
	}

	const user = await UserModel.findEmailById(verified.userId);

	if (!user) {
		return {
			success: false,
			reason: 'profile:error.deleteAccountInvalidLink',
		};
	}

	const tokenConsumed = await AuthTokenModel.markTokenUsed(
		verified.tokenHash,
		tokenTypes.accountDeletion,
		verified.userId,
	);

	if (!tokenConsumed) {
		return {
			success: false,
			reason: 'profile:error.deleteAccountInvalidLink',
		};
	}

	const deletedUser = await UserModel.deleteById(verified.userId);

	if (!deletedUser) {
		return {
			success: false,
			reason: 'common:error.generic',
		};
	}

	return {
		success: true,
		user: deletedUser,
	};
}
