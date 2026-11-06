//! middlewares/i18n.js

/**
 * i18next Express middleware integration.
 *
 * This middleware:
 * 1. Attaches i18next to the Express request lifecycle.
 * 2. Exposes translation helpers to all EJS views.
 *
 * After this middleware runs:
 *   - req.t(key) becomes available in routes
 *   - t(key) becomes available inside EJS templates
 *   - currentLang is available for UI logic (language switcher, html lang attr, etc.)
 */

import { i18next, i18nextMiddleware } from '../config/i18n.js';
import { SUPPORTED_LANGUAGES, SUPPORTED_LANGUAGE_CODES } from '../config/languages.js';
import env from '../config/dotenv.js';
import { getLocale, setLangCookie } from '../services/i18n/locale.js';

function setLocalizedSeoUrls(res, lang, pagePath) {
	const siteUrl = env.CLIENT_URL.endsWith('/')
		? env.CLIENT_URL.slice(0, -1)
		: env.CLIENT_URL;
	const getLanguagePath = (code) => `/${code}${pagePath}`;

	res.locals.canonicalUrl = new URL(getLanguagePath(lang), `${siteUrl}/`).toString();
	res.locals.hreflangUrls = SUPPORTED_LANGUAGE_CODES.map((code) => ({
		lang: code,
		url: new URL(getLanguagePath(code), `${siteUrl}/`).toString(),
	}));
	res.locals.hreflangUrls.push({
		lang: 'x-default',
		url: new URL(`/en${pagePath}`, `${siteUrl}/`).toString(),
	});
}

/**
 * Add locale-aware SEO links to an unprefixed public page using the visitor's locale.
 *
 * @returns {import('express').RequestHandler}
 */
export function setCookiePublicPageSeo(req, res, next) {
	const lang = getLocale(req);
	let pagePath = req.path;
	while (pagePath.length > 1 && pagePath.endsWith('/')) {
		pagePath = pagePath.slice(0, -1);
	}
	setLocalizedSeoUrls(res, lang, pagePath === '/' ? '' : pagePath);
	next();
}

/**
 * Set the locale and SEO URL metadata for a language-prefixed public page.
 *
 * @param {string} lang
 * @returns {import('express').RequestHandler}
 */
export function setPublicPageLocale(lang) {
	return async (req, res, next) => {
		try {
			if (!SUPPORTED_LANGUAGE_CODES.includes(lang)) {
				return next();
			}

			await req.i18n.changeLanguage(lang);
			req.publicLocale = lang;
			setLangCookie(res, lang);
			res.locals.currentLang = lang;
			res.locals.t = req.t;

			let pathWithoutLocale = req.path;
			if (pathWithoutLocale === `/${lang}`) {
				pathWithoutLocale = '/';
			} else if (pathWithoutLocale.startsWith(`/${lang}/`)) {
				pathWithoutLocale = pathWithoutLocale.slice(`/${lang}`.length);
			}
			while (pathWithoutLocale.endsWith('/')) {
				pathWithoutLocale = pathWithoutLocale.slice(0, -1);
			}
			pathWithoutLocale ||= '/';
			const pagePath = pathWithoutLocale === '/' ? '' : pathWithoutLocale;
			setLocalizedSeoUrls(res, lang, pagePath);

			next();
		} catch (error) {
			next(error);
		}
	};
}

const i18nextMiddlewares = (app) => {
	/**
	 * Attach i18next middleware to Express.
	 * Must be placed:
	 *   after session middleware
	 *   before application routes
	 */
	app.use(i18nextMiddleware.handle(i18next));

	/**
	 * Expose translation utilities to EJS views.
	 *
	 * res.locals.t → translation function
	 * res.locals.currentLang → currently resolved language
	 */
	app.use(async (req, res, next) => {
		try {
			const currentLang = getLocale(req);

			if (req.i18n && req.language !== currentLang) {
				await req.i18n.changeLanguage(currentLang);
			}

			res.locals.t = req.t;
			res.locals.currentLang = currentLang;
			res.locals.languages = SUPPORTED_LANGUAGES;
			next();
		} catch (error) {
			next(error);
		}
	});
};

export default i18nextMiddlewares;
