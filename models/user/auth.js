//! models/user/auth.js

import { query, queryRows } from '../../config/database.js';

export async function findByEmailBasic(email) {
	const q = `
		SELECT id, email, is_verified
		FROM users
		WHERE email = $1
		LIMIT 1
	`;

	const rows = await queryRows(q, [email]);
	return rows[0] || null;
}

export async function createLocalPendingUser(email, locale) {
	const q = `
		INSERT INTO users (email, locale)
		VALUES ($1, $2)
		RETURNING id, email, locale, is_verified, created_at
	`;

	const rows = await queryRows(q, [email, locale]);
	return rows[0] || null;
}

export async function updateIsVerifiedById(userId, isVerified) {
	const q = `
		UPDATE users
		SET
			is_verified = $1,
			updated_at = NOW()
		WHERE id = $2;
	`;

	const result = await query(q, [isVerified, userId]);

	return result.rowCount > 0;
}

export async function completeLocalSignupById(
	userId,
	username,
	hashedPassword,
	avatarSeed = null,
	countryCode = null,
	legalVersions,
) {
	const lowerCasedUsername = username.toLowerCase();

	const q = `
		UPDATE users
		SET
			username = $1,
			username_normalized = $2,
			hashed_password = $3,
			avatar_seed = $4,
			country_code = $5,
			terms_accepted_at = NOW(),
			terms_version = $6,
			privacy_accepted_at = NOW(),
			privacy_version = $7,
			updated_at = NOW()
		WHERE id = $8
			AND username IS NULL
			AND hashed_password IS NULL
		RETURNING
			id,
			username,
			email,
			is_verified,
			locale,
			country_code,
			theme,
			avatar_seed;
	`;

	const rows = await queryRows(q, [
		username,
		lowerCasedUsername,
		hashedPassword,
		avatarSeed,
		countryCode,
		legalVersions.terms,
		legalVersions.privacy,
		userId,
	]);

	return rows[0] || null;
}

export async function findForLocalSignin(identifier, identifierType) {
	const lookupColumnMap = {
		email: 'email',
		username: 'username_normalized',
	};
	const lookupColumn = lookupColumnMap[identifierType];

	if (!lookupColumn) {
		throw new Error(`Unsupported identifier type: ${identifierType}`);
	}

	const q = `
		SELECT
			id,
			email,
			username,
			hashed_password,
			is_blocked,
			locale,
			country_code,
			theme,
			avatar_seed
		FROM users
		WHERE ${lookupColumn} = $1
			AND username IS NOT NULL
			AND hashed_password IS NOT NULL
		LIMIT 1;
	`;

	const rows = await queryRows(q, [identifier]);

	return rows[0] ?? null;
}

export async function findUserForRecovery(email) {
	const q = `
		SELECT
			id,
			email,
			is_verified,
			is_blocked,
			(hashed_password IS NOT NULL) AS has_password
		FROM users
		WHERE email = $1
		LIMIT 1;
	`;

	const rows = await queryRows(q, [email]);
	return rows[0] ?? null;
}

export async function updatePasswordById(userId, hashedPassword) {
	const q = `
		UPDATE users
		SET hashed_password = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, email;
	`;

	const rows = await queryRows(q, [hashedPassword, userId]);
	return rows[0] || null;
}

export async function createOAuthUser(email, locale = 'en', isVerified = true) {
	const q = `
		INSERT INTO users (
			email,
			locale,
			is_verified
		)
		VALUES ($1, $2, $3)
		RETURNING
			id,
			email,
			username,
			is_verified,
			is_blocked,
			locale,
			country_code,
			theme,
			avatar_seed;
	`;

	const rows = await queryRows(q, [email, locale, isVerified]);
	return rows[0] ?? null;
}

export async function completeOAuthSignupById(
	userId,
	username,
	avatarSeed = null,
	countryCode = null,
	legalVersions,
) {
	const lowerCasedUsername = username.toLowerCase();

	const q = `
		UPDATE users
		SET
			username = $1,
			username_normalized = $2,
			avatar_seed = $3,
			country_code = $4,
			terms_accepted_at = NOW(),
			terms_version = $5,
			privacy_accepted_at = NOW(),
			privacy_version = $6,
			updated_at = NOW()
		WHERE id = $7
			AND username IS NULL
		RETURNING
			id,
			username,
			email,
			is_verified,
			is_blocked,
			locale,
			country_code,
			theme,
			avatar_seed;
	`;

	try {
		const rows = await queryRows(q, [
			username,
			lowerCasedUsername,
			avatarSeed,
			countryCode,
			legalVersions.terms,
			legalVersions.privacy,
			userId,
		]);

		return {
			success: rows.length > 0,
			user: rows[0],
		};
	} catch (error) {
		if (error.code === '23505') {
			return {
				success: false,
				reason: 'auth:error.username_taken',
			};
		}

		throw error;
	}
}

export async function updateLastSignIn(userId) {
	const q = `
		UPDATE users
		SET last_signin_at = NOW(), updated_at = NOW()
		WHERE id = $1;
	`;

	const result = await query(q, [userId]);
	return result.rowCount > 0;
}
