//! routes/publicPagesLang.js

import { Router } from 'express';
import { SUPPORTED_LANGUAGE_CODES } from '../config/languages.js';
import {
	setCookiePublicPageSeo,
	setPublicPageLocale,
} from '../middlewares/i18n.js';
import { renderHome } from '../controllers/home.js';
import {
	renderPrivacyPolicy,
	renderTermsOfService,
} from '../controllers/legal.js';

const router = Router();

// Language-prefixed public pages use the locale in the URL.
for (const lang of SUPPORTED_LANGUAGE_CODES) {
	const setLocale = setPublicPageLocale(lang);
	router.get(`/${lang}`, setLocale, renderHome);
	router.get(`/${lang}/legal/privacy`, setLocale, renderPrivacyPolicy);
	router.get(`/${lang}/legal/terms`, setLocale, renderTermsOfService);
}

// Unprefixed public pages use the visitor's saved or detected language.
router.get('/', setCookiePublicPageSeo, renderHome);
router.get('/legal/privacy', setCookiePublicPageSeo, renderPrivacyPolicy);
router.get('/legal/terms', setCookiePublicPageSeo, renderTermsOfService);

export default router;
