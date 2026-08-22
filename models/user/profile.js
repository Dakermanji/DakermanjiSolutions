//! models/user/profile.js

import { query, queryRows } from '../../config/database.js';

export async function usernameExists(username) {
	const normalizedUsername = String(username ?? '')
		.trim()
		.toLowerCase();

	const q = `
		SELECT 1
		FROM users
		WHERE username_normalized = $1
		LIMIT 1;
	`;

	const result = await query(q, [normalizedUsername]);

	return result.rowCount > 0;
}

export async function updateAvatarById(userId, avatarSeed) {
	const q = `
		UPDATE users
		SET avatar_seed = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, avatar_seed;
	`;

	const rows = await queryRows(q, [avatarSeed, userId]);
	return rows[0] || null;
}

export async function updateCountryById(userId, countryCode) {
	const q = `
		UPDATE users
		SET country_code = $1, updated_at = NOW()
		WHERE id = $2
		RETURNING id, country_code;
	`;

	const rows = await queryRows(q, [countryCode, userId]);
	return rows[0] || null;
}

export async function updateUsernameById(userId, username) {
	const lowerCasedUsername = username.toLowerCase();

	const q = `
		UPDATE users
		SET
			username = $1,
			username_normalized = $2,
			updated_at = NOW()
		WHERE id = $3;
	`;

	try {
		const result = await query(q, [username, lowerCasedUsername, userId]);

		return {
			success: result.rowCount > 0,
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

export async function findByUsername(username) {
	const normalizedUsername = String(username ?? '')
		.trim()
		.toLowerCase();

	const q = `
		SELECT id, username, email
		FROM users
		WHERE username_normalized = $1
		LIMIT 1;
	`;

	const result = await query(q, [normalizedUsername]);
	console.log(result);
	return result.rows[0] || null;
}

export async function findBasicById(userId) {
	const q = `
		SELECT id, username, email
		FROM users
		WHERE id = $1
		LIMIT 1;
	`;

	const rows = await queryRows(q, [userId]);
	return rows[0] || null;
}

export async function findPasswordById(userId) {
	const q = `
		SELECT id, hashed_password
		FROM users
		WHERE id = $1
		LIMIT 1;
	`;

	const rows = await queryRows(q, [userId]);
	return rows[0] || null;
}

export async function findEmailById(userId) {
	const q = `
		SELECT id, email
		FROM users
		WHERE id = $1
		LIMIT 1;
	`;

	const rows = await queryRows(q, [userId]);
	return rows[0] || null;
}

export async function deleteById(userId) {
	const q = `
		DELETE FROM users
		WHERE id = $1
		RETURNING id, email;
	`;

	const rows = await queryRows(q, [userId]);
	return rows[0] || null;
}
