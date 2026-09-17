//! controllers/auth/signout.js

import logger from '../../config/logger.js';
import { SESSION_COOKIE_NAME } from '../../middlewares/session.js';

/**
 * Sign out the current user.
 *
 * Flow:
 * - logs the user out from passport
 * - destroys the session
 * - clears session cookie
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {Promise<void>}
 */
export async function signout(req, res) {
	try {
		req.logout((err) => {
			if (err) {
				logger.error('Logout failed', {
					type: 'auth',
					controller: 'signout',
					error: err.message,
				});

				req.flash('error', 'common:error.generic');
				return res.redirect('/');
			}

			req.session.destroy((sessionErr) => {
				if (sessionErr) {
					logger.error('Session destruction failed', {
						type: 'auth',
						controller: 'signout',
						error: sessionErr.message,
					});

					req.flash('error', 'common:error.generic');
					return res.redirect('/');
				}

				res.clearCookie(SESSION_COOKIE_NAME);

				req.sessionStore.generate(req);
				req.flash('success', 'auth:signout.success');

				return req.session.save((saveErr) => {
					if (saveErr) {
						logger.error(
							'Failed to save renewed session after logout',
							{
								type: 'auth',
								controller: 'signout',
								error: saveErr.message,
							},
						);
					}

					return res.redirect('/');
				});
			});
		});
	} catch (err) {
		logger.error(err.message, {
			type: 'auth',
			controller: 'signout',
		});

		req.flash('error', 'common:error.generic');
		return res.redirect('/');
	}
}

export default signout;
