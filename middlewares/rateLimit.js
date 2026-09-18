//! middlewares/rateLimit.js

import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import env from '../config/dotenv.js';

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

function prefersJson(req) {
	return req.xhr || req.get('accept')?.includes('application/json');
}

function handleRateLimit(req, res) {
	const title = req.t?.('common:error.rate_limited_title') || 'Too many requests';
	const message = req.t?.('common:error.rate_limited')
		|| 'Too many requests. Please wait and try again.';

	if (prefersJson(req)) {
		return res.status(429).json({
			ok: false,
			error: 'rate_limited',
			message,
		});
	}

	return res.status(429).render('error', {
		status: 429,
		title,
		message,
		stack: null,
		env: env.NODE_ENV,
	});
}

function userOrIpKey(req) {
	return req.user?.id
		? `user:${req.user.id}`
		: `ip:${ipKeyGenerator(req.ip)}`;
}

function createLimiter({ windowMs, limit, keyGenerator, identifier }) {
	return rateLimit({
		windowMs,
		limit,
		identifier,
		standardHeaders: 'draft-8',
		legacyHeaders: false,
		handler: handleRateLimit,
		...(keyGenerator ? { keyGenerator } : {}),
	});
}

export const dynamicRequestLimiter = createLimiter({
	windowMs: 15 * MINUTE,
	limit: 500,
	identifier: 'dynamic-requests',
});

export const signInLimiter = createLimiter({
	windowMs: 15 * MINUTE,
	limit: 20,
	identifier: 'sign-in',
});

export const signupLimiter = createLimiter({
	windowMs: HOUR,
	limit: 5,
	identifier: 'signup',
});

export const recoveryLimiter = createLimiter({
	windowMs: HOUR,
	limit: 5,
	identifier: 'account-recovery',
});

export const passwordResetLimiter = createLimiter({
	windowMs: 15 * MINUTE,
	limit: 10,
	identifier: 'password-reset',
});

export const oauthStartLimiter = createLimiter({
	windowMs: 15 * MINUTE,
	limit: 30,
	identifier: 'oauth-start',
});

export const contactLimiter = createLimiter({
	windowMs: HOUR,
	limit: 5,
	keyGenerator: userOrIpKey,
	identifier: 'contact-email',
});

export const externalApiLimiter = createLimiter({
	windowMs: MINUTE,
	limit: 60,
	keyGenerator: userOrIpKey,
	identifier: 'external-api',
});

export const roomSearchLimiter = createLimiter({
	windowMs: MINUTE,
	limit: 60,
	keyGenerator: userOrIpKey,
	identifier: 'room-search',
});

export const messageWriteLimiter = createLimiter({
	windowMs: MINUTE,
	limit: 30,
	keyGenerator: userOrIpKey,
	identifier: 'message-write',
});
