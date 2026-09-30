//! models/user/preferences.js

import { query } from '../../config/database.js';
import { PRESENCE_SELECTABLE_STATUSES } from '../../constants/presence.js';

export async function findPresencePreference(userId) {
	const result = await query('SELECT presence_status FROM users WHERE id = $1', [userId]);
	if (!result.rows[0]) throw new Error('Presence user not found');
	return result.rows[0].presence_status;
}

export async function updatePresencePreference(userId, status) {
	if (!PRESENCE_SELECTABLE_STATUSES.includes(status)) throw new Error('Invalid presence preference');
	const result = await query(
		'UPDATE users SET presence_status = $1, updated_at = NOW() WHERE id = $2',
		[status, userId],
	);
	if (result.rowCount !== 1) throw new Error('Presence user not found');
}

export async function updateLocale(userId, locale) {
	const q = `
		UPDATE users
		SET locale = $1, updated_at = NOW()
		WHERE id = $2;
	`;

	const result = await query(q, [locale, userId]);
	return result.rowCount > 0;
}

export async function updateTheme(userId, theme) {
	const q = `
		UPDATE users
		SET theme = $1, updated_at = NOW()
		WHERE id = $2;
	`;

	const result = await query(q, [theme, userId]);
	return result.rowCount > 0;
}
