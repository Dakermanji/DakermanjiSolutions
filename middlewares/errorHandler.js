//! middlewares/errorHandler.js

import logger from '../config/logger.js';
import env from '../config/dotenv.js';

export default function errorHandler(err, req, res, next) {
	const status = err.status || 500;

	logger.error(err.message, { type: 'server' });

	if (err.code === 'EBADCSRFTOKEN') {
		const acceptsJson = req.xhr
			|| req.get('accept')?.includes('application/json');

		if (acceptsJson) {
			return res.status(403).json({
				ok: false,
				error: 'invalid_csrf_token',
			});
		}

		return res.status(403).render('error', {
			status: 403,
			title: 'Forbidden',
			message: 'The request could not be verified. Please reload and try again.',
			stack: err.stack,
			env: env.NODE_ENV,
		});
	}

	res.status(status).render('error', {
		status,
		title: status === 404 ? 'Not Found' : 'Server Error',
		message:
			status === 404
				? 'The requested page could not be found.'
				: 'Something went wrong.',
		stack: err.stack,
		env: env.NODE_ENV,
	});
}
