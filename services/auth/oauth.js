//! services/auth/oauth.js

import UserModel from '../../models/User.js';
import AuthSecurityModel from '../../models/auth/Security.js';
import UserProviderModel from '../../models/user/provider.js';
import { getLocale, setLangCookie } from '../i18n/locale.js';

/**
 * Normalize OAuth provider email.
 *
 * Responsibilities:
 * - safely read email from provider profile
 * - normalize casing and spacing
 * - return null when email is missing
 *
 * @param {string | undefined | null} email
 * @returns {string | null}
 */
function normalizeOAuthEmail(email) {
	if (typeof email !== 'string') {
		return null;
	}

	const normalizedEmail = email.toLowerCase().trim();

	return normalizedEmail || null;
}

function getOAuthRedirect(req) {
	const redirectTo = req.session.oauthReturnTo === '/profile' ? '/profile' : '/';

	delete req.session.oauthReturnTo;
	delete req.session.oauthIntent;

	return redirectTo;
}

/**
 * Build a reusable Passport OAuth verify callback.
 *
 * Responsibilities:
 * - keep provider strategy files small
 * - centralize shared OAuth sign-in/sign-up logic
 * - support multiple providers with the same account-link flow
 *
 * Expected flow:
 * - extract provider account id
 * - extract and normalize email
 * - find existing linked account
 * - otherwise find user by email
 * - create OAuth user if needed
 * - create provider link if needed
 * - load session-safe user
 *
 * @param {object} options
 * @param {'google' | 'github' | 'discord'} options.provider
 * @param {(profile: any) => string | number | null | undefined} options.getProviderUserId
 * @param {(profile: any) => string | null | undefined} options.getEmail
 *  @param {(params: { profile: any, accessToken: string }) => Promise<string | null> | string | null} [options.resolveEmail]
 * @returns {(
 *   req: import('express').Request,
 *   accessToken: string,
 *   refreshToken: string,
 *   profile: any,
 *   done: (error: unknown, user?: Express.User | false | null) => void,
 * ) => Promise<void>}
 */
export function createOAuthVerifyCallback({
	provider,
	getProviderUserId,
	getEmail,
	resolveEmail = null,
}) {
	/**
	 * Shared Passport OAuth verify callback.
	 *
	 * @param {import('express').Request} req
	 * @param {string} _accessToken
	 * @param {string} _refreshToken
	 * @param {any} profile
	 * @param {(error: unknown, user?: Express.User | false | null) => void} done
	 * @returns {Promise<void>}
	 */
	return async function oauthVerifyCallback(
		req,
		_accessToken,
		_refreshToken,
		profile,
		done,
	) {
		try {
			const locale = getLocale(req);

			const providerUserId = getProviderUserId(profile);
			const profileEmail = getEmail(profile);
			let resolvedEmail = null;

			if (!profileEmail && resolveEmail) {
				resolvedEmail = await resolveEmail({
					profile,
					accessToken: _accessToken,
				});
			}

			const rawEmail = profileEmail || resolvedEmail;
			const email = normalizeOAuthEmail(rawEmail);

			if (!providerUserId || !email) {
				return done(null, false);
			}

			if (req.session?.oauthIntent === 'link' && req.user?.id) {
				const linkedUser =
					await UserProviderModel.findUserByProviderAccount(
						provider,
						String(providerUserId),
					);

				if (linkedUser && linkedUser.id !== req.user.id) {
					req.session.oauthLinkError = 'profile:method.alreadyLinked';
					const sessionUser = await UserModel.findByIdForSession(req.user.id);

					return done(null, sessionUser || req.user);
				}

				const existingProviderLink =
					await UserProviderModel.findByUserAndProvider(req.user.id, provider);

				if (!linkedUser && !existingProviderLink) {
					await UserProviderModel.createLink(
						req.user.id,
						provider,
						String(providerUserId),
					);
				}

				const sessionUser = await UserModel.findByIdForSession(req.user.id);

				return done(null, sessionUser || req.user);
			}

			const linkedUser =
				await UserProviderModel.findUserByProviderAccount(
					provider,
					String(providerUserId),
			);

			if (linkedUser) {
				const sessionUser = await UserModel.findByIdForSession(linkedUser.id);

				return done(null, sessionUser || linkedUser);
			}

			let user = await UserModel.findByEmailBasic(email);

			if (!user) {
				user = await UserModel.createOAuthUser(email, locale, true);
			}

			const userId = user.id;

			await UserProviderModel.createLink(
				userId,
				provider,
				String(providerUserId),
			);

			const sessionUser = await UserModel.findByIdForSession(userId);

			if (!sessionUser) {
				return done(null, false);
			}

			await UserModel.updateLastSignIn(userId);
			await AuthSecurityModel.recordSuccessfulSignin(userId);

			return done(null, sessionUser);
		} catch (error) {
			return done(error);
		}
	};
}

/**
 * Handle shared OAuth callback result.
 *
 * Responsibilities:
 * - propagate authentication errors
 * - handle failed OAuth authentication
 * - log user into the session
 * - sync language cookie from user locale or remembered request locale
 * - redirect incomplete OAuth users to username completion
 * - redirect completed users home
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @param {unknown} err
 * @param {Express.User | false | null | undefined} user
 * @returns {void}
 */
export function handleOAuthCallback(req, res, next, err, user) {
	if (err) {
		return next(err);
	}

	if (!user) {
		req.flash('error', 'auth:error.oauth_failed');
		return res.redirect(getOAuthRedirect(req));
	}

	const locale = getLocale(req);
	delete req.session.oauthLocale;
	const redirectTo = getOAuthRedirect(req);
	const linkError = req.session.oauthLinkError;
	delete req.session.oauthLinkError;

	return req.logIn(user, (loginErr) => {
		if (loginErr) {
			return next(loginErr);
		}

		const lang = user?.locale || locale;
		setLangCookie(res, lang);

		if (!user.username) {
			req.flash('modal', 'complete_signup_oauth');
			return res.redirect('/');
		}

		if (linkError) {
			req.flash('error', linkError);
			return res.redirect(redirectTo);
		}

		if (redirectTo === '/profile') {
			req.flash('success', 'profile:method.linked');
		}

		return res.redirect(redirectTo);
	});
}
