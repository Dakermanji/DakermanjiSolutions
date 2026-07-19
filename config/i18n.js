//! config/i18n.js

/**
 * Internationalization configuration using i18next.
 *
 * This file initializes i18next with:
 * - filesystem backend for loading translation JSON files
 * - language detection middleware for Express
 *
 * Supported languages:
 *   languages are dynamically imported with en as default
 *
 * Translation files must follow this structure:
 *   /locales/{lng}/{namespace}.json
 * Example:
 *   /locales/en/common.json
 *   /locales/fr/common.json
 */

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SUPPORTED_LANGUAGE_CODES } from './languages.js';

// Recreate __dirname in ESM (not available by default)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NAME_SPACES = [
	'layout',
	'auth',
	'home',
	'common',
	'chat',
	'notifications',
	'social',
	'profile',
	'weather',
];

/**
 * Initialize i18next
 *
 * Backend: loads translation files from /locales
 * Detection: determines language from path, querystring, cookie, or header
 */
await i18next
	// Load translations from filesystem
	.use(Backend)

	// Enable language detection middleware for Express
	.use(i18nextMiddleware.LanguageDetector)

	.init({
		// Default language if detection fails
		fallbackLng: 'en',

		// Preload languages at startup (improves performance)
		preload: SUPPORTED_LANGUAGE_CODES,

		// Allowed languages
		supportedLngs: SUPPORTED_LANGUAGE_CODES,

		// Namespaces allow splitting translations into multiple files
		ns: NAME_SPACES,
		defaultNS: 'layout',

		// Translation file path pattern
		backend: {
			loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
		},

		// Language detection strategy
		detection: {
			// Order of detection
			order: ['path', 'querystring', 'cookie', 'header'],

			// Cache detected language in cookie
			caches: ['cookie'],

			// Cookie name
			lookupCookie: 'lang',
		},

		// Disable HTML escaping (EJS already escapes output)
		interpolation: {
			escapeValue: false,
		},

		// Enable returning objects
		returnObjects: true,
	});

// Export initialized instances
export { i18next, i18nextMiddleware };
