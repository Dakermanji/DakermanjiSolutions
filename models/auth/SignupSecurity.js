//! models/auth/SignupSecurity.js

import { query, queryRows } from '../../config/database.js';

/**
 * Signup Security Model
 * ---------------------
 * Handles signup_security table operations.
 *
 * Responsibilities:
 * - read signup abuse state
 * - create state row if missing
 * * - update attempt counters
 * - apply temporary lock
 *
 * Notes:
 * - tracks signup start only
 * - supports both IP-based and email-based checks
 */

/**
 * Find signup security row by IP + email pair.
 *
 * @param {{
 *   ipAddress: string,
 *   email?: string | null
 * }} params
 * @returns {Promise<{
 *   id: string,
 *   ip_address: string,
 *   email: string | null,
 *   attempt_count: number,
 *   last_attempt_at: Date,
 *   locked_until: Date | null,
 *   created_at: Date,
 *   updated_at: Date
 * } | null>}
 */
async function findByIpAndEmail({ ipAddress, email = null }) {
	const q = `
		SELECT
			id,
			ip_address,
			email,
			attempt_count,
			last_attempt_at,
			locked_until,
			created_at,
			updated_at
		FROM signup_security
		WHERE ip_address = $1
			AND email IS NOT DISTINCT FROM $2
		LIMIT 1;
	`;

	const rows = await queryRows(q, [ipAddress, email]);
	return rows[0] ?? null;
}

/**
 * Find the most recent signup security row by email.
 *
 * Used for email cooldown checks.
 *
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findLatestByEmail(email) {
	const q = `
		SELECT
			id,
			ip_address,
			email,
			attempt_count,
			last_attempt_at,
			locked_until,
			created_at,
			updated_at
		FROM signup_security
		WHERE email = $1
		ORDER BY last_attempt_at DESC
		LIMIT 1;
	`;

	const rows = await queryRows(q, [email]);
	return rows[0] ?? null;
}

/**
 * Find the most recent signup security row by IP.
 *
 * Used for IP-level abuse checks.
 *
 * @param {string} ipAddress
 * @returns {Promise<object|null>}
 */
async function findLatestByIp(ipAddress) {
	const q = `
		SELECT
			id,
			ip_address,
			email,
			attempt_count,
			last_attempt_at,
			locked_until,
			created_at,
			updated_at
		FROM signup_security
		WHERE ip_address = $1
		ORDER BY last_attempt_at DESC
		LIMIT 1;
	`;

	const rows = await queryRows(q, [ipAddress]);
	return rows[0] ?? null;
}

/**
 * Create signup security row if missing.
 *
 * @param {{
 *   ipAddress: string,
 *   email?: string | null
 * }} params
 * @returns {Promise<void>}
 */
async function createIfMissing({ ipAddress, email = null }) {
	const existingRow = await findByIpAndEmail({
		ipAddress,
		email,
	});

	if (existingRow) {
		return;
	}

	const q = `
		INSERT INTO signup_security (
			ip_address,
			email
		)
		VALUES ($1, $2);
	`;

	await query(q, [ipAddress, email]);
}

/**
 * Record one signup attempt.
 *
 * Behavior:
 * - ensures row exists
 * - increments attempt_count
 * - updates last_attempt_at
 * - updates updated_at
 *
 * @param {{
 *   ipAddress: string,
 *   email?: string | null
 * }} params
 * @returns {Promise<void>}
 */
async function recordAttempt({ ipAddress, email = null }) {
	await createIfMissing({ ipAddress, email });

	const q = `
		UPDATE signup_security
		SET
			attempt_count = attempt_count + 1,
			last_attempt_at = NOW(),
			updated_at = NOW()
		WHERE ip_address = $1
			AND email IS NOT DISTINCT FROM $2;
	`;

	await query(q, [ipAddress, email]);
}

/**
 * Set temporary lock for signup attempts.
 *
 * @param {{
 *   ipAddress: string,
 *   email?: string | null,
 *   lockedUntil: Date
 * }} params
 * @returns {Promise<void>}
 */
async function setLockedUntil({ ipAddress, email = null, lockedUntil }) {
	await createIfMissing({ ipAddress, email });

	const q = `
		UPDATE signup_security
		SET
			locked_until = $3,
			updated_at = NOW()
		WHERE ip_address = $1
			AND email IS NOT DISTINCT FROM $2;
	`;

	await query(q, [ipAddress, email, lockedUntil]);
}

export default {
	findByIpAndEmail,
	findLatestByEmail,
	findLatestByIp,
	createIfMissing,
	recordAttempt,
	setLockedUntil,
};
