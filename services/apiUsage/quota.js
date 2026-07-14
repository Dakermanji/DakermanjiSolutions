//! services/apiUsage/quota.js

import ExternalApiRequestLogModel from '../../models/apiUsage/RequestLog.js';
import { API_USAGE_LIMITS } from './limits.js';

function getLimitRules(provider, requestKey) {
	return API_USAGE_LIMITS[provider]?.[requestKey] || [];
}

function getActor(req) {
	return {
		userId: req.user?.id || null,
	};
}

function getRetryAt(durationMs) {
	return new Date(Date.now() + durationMs);
}

export async function checkExternalApiQuota(req, { provider, requestKey }) {
	const actor = getActor(req);
	const rules = getLimitRules(provider, requestKey);

	if (!actor.userId) {
		return {
			allowed: false,
			retryAt: getRetryAt(60 * 1000),
			window: 'auth',
		};
	}

	for (const rule of rules) {
		const since = new Date(Date.now() - rule.durationMs);
		const count = await ExternalApiRequestLogModel.countRecentByActor({
			...actor,
			provider,
			requestKey,
			since,
		});

		if (count >= rule.max) {
			return {
				allowed: false,
				retryAt: getRetryAt(rule.durationMs),
				window: rule.key,
			};
		}
	}

	return {
		allowed: true,
	};
}

export async function recordExternalApiRequest(
	req,
	{
		provider,
		requestKey,
		responseStatus = null,
		errorCode = null,
	} = {},
) {
	const actor = getActor(req);

	if (!actor.userId) {
		return;
	}

	await ExternalApiRequestLogModel.insert({
		...actor,
		provider,
		requestKey,
		route: req.originalUrl || req.path || null,
		method: req.method || null,
		responseStatus,
		errorCode,
	});
}
