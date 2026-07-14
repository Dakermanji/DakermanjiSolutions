//! models/apiUsage/RequestLog.js

import { query, queryRows } from '../../config/database.js';

async function countRecentByActor({
	userId,
	provider,
	requestKey,
	since,
}) {
	const q = `
		SELECT COUNT(*)::int AS count
		FROM external_api_request_logs
		WHERE provider = $1
			AND request_key = $2
			AND created_at >= $3
			AND user_id = $4;
	`;

	const rows = await queryRows(q, [provider, requestKey, since, userId]);
	return rows[0]?.count || 0;
}

async function insert({
	userId = null,
	provider,
	requestKey,
	route = null,
	method = null,
	responseStatus = null,
	errorCode = null,
}) {
	const q = `
		INSERT INTO external_api_request_logs (
			user_id,
			provider,
			request_key,
			route,
			method,
			response_status,
			error_code
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7);
	`;

	await query(q, [
		userId,
		provider,
		requestKey,
		route,
		method,
		responseStatus,
		errorCode,
	]);
}

export default {
	countRecentByActor,
	insert,
};
