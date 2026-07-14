//! models/user/provider.js

import { queryRows } from '../../config/database.js';

/**
 * Find a linked user by provider account.
 *
 * @param {'google' | 'github' | 'discord'} provider
 * @param {string} providerUserId
 * @returns {Promise<{
 *   id: string,
 *   email: string,
 *   username: string | null,
 *   is_verified: boolean,
 *   is_blocked: boolean,
 *   locale: string,
 *   country_code: string | null,
 *   theme: string,
 *   avatar_seed: string | null
 * } | null>}
 */
async function findUserByProviderAccount(provider, providerUserId) {
	const q = `
        SELECT
            u.id,
            u.email,
            u.username,
            u.is_verified,
            u.is_blocked,
            u.locale,
            u.country_code,
            u.theme,
            u.avatar_seed
        FROM user_providers up
        INNER JOIN users u
            ON u.id = up.user_id
        WHERE up.provider = $1
            AND up.provider_user_id = $2
        LIMIT 1;
    `;

	const rows = await queryRows(q, [provider, providerUserId]);
	return rows[0] ?? null;
}

/**
 * Create a provider link for a user.
 *
 * @param {string} userId
 * @param {'google' | 'github' | 'discord'} provider
 * @param {string} providerUserId
 * @returns {Promise<{ user_id: string, provider: string, provider_user_id: string } | null>}
 */
async function createLink(userId, provider, providerUserId) {
	const q = `
        INSERT INTO user_providers (
            user_id,
            provider,
            provider_user_id
        )
        VALUES ($1, $2, $3)
        RETURNING user_id, provider, provider_user_id;
    `;

	const rows = await queryRows(q, [userId, provider, providerUserId]);
	return rows[0] ?? null;
}

async function findByUserAndProvider(userId, provider) {
	const q = `
        SELECT user_id, provider, provider_user_id
        FROM user_providers
        WHERE user_id = $1
            AND provider = $2
        LIMIT 1;
    `;

	const rows = await queryRows(q, [userId, provider]);
	return rows[0] ?? null;
}

export default {
	findUserByProviderAccount,
	createLink,
	findByUserAndProvider,
};
