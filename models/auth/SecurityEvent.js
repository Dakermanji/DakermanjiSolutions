//! models/auth/SecurityEvent.js

import { query, queryRows } from '../../config/database.js';

/**
 * Auth Security Event Model
 * -------------------------
 * Handles insertions into auth_security_events table.
 *
 * Notes:
 * - append-only table
 * - no updates or deletes
 */

/**
 * Insert a new auth security event.
 *
 * Responsibilities:
 * - persist one auth event row
 * - store request metadata when available
 *
 * Notes:
 * - userId is optional for pre-user failures
 * - identifier can be email or username
 * - ipAddress uses PostgreSQL INET column
 *
 * @param {{
 *   userId?: string | null,
 *   identifier?: string | null,
 *   eventType: string,
 *   ipAddress?: string | null,
 *   userAgent?: string | null
 * }} params
 * @returns {Promise<void>}
 */
async function insertAuthEvent({
	userId = null,
	identifier = null,
	eventType,
	ipAddress = null,
	userAgent = null,
}) {
	const q = `
		INSERT INTO auth_security_events (
			user_id,
			identifier,
			ip_address,
			event_type,
			user_agent
		)
		VALUES ($1, $2, $3, $4, $5);
	`;

	await query(q, [userId, identifier, ipAddress, eventType, userAgent]);
}

/**
 * Count recent auth security events by one searchable field.
 *
 * Supported fields:
 * - ip
 * - identifier
 *
 * @param {Object} params
 * @param {string} params.eventType
 * @param {'ip' | 'identifier'} params.field
 * @param {string} params.value
 * @param {Date | string} params.since
 * @returns {Promise<number>}
 */
export async function countRecentByField({ eventType, field, value, since }) {
	let whereField;

	if (field === 'ip') {
		whereField = 'ip_address';
	} else if (field === 'identifier') {
		whereField = 'identifier';
	} else {
		throw new Error(`Unsupported rate limit field: ${field}`);
	}

	const q = `
		SELECT COUNT(*)::int AS count
		FROM auth_security_events
		WHERE event_type = $1
			AND ${whereField} = $2
			AND created_at >= $3
	`;

	const rows = await queryRows(q, [eventType, value, since]);
	return rows[0]?.count || 0;
}

export default {
	insertAuthEvent,
	countRecentByField,
};
