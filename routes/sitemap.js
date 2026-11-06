//! routes/sitemap.js

import { Router } from 'express';
import env from '../config/dotenv.js';
import { SUPPORTED_LANGUAGE_CODES } from '../config/languages.js';

const router = Router();
const PUBLIC_PAGE_PATHS = ['', '/legal/privacy', '/legal/terms'];

function getSitemapXml() {
	const siteUrl = new URL('/', env.CLIENT_URL).origin;
	const entries = SUPPORTED_LANGUAGE_CODES.flatMap((lang) =>
		PUBLIC_PAGE_PATHS.map((pagePath) => {
			const getLocalizedUrl = (language) =>
				new URL(`/${language}${pagePath}`, `${siteUrl}/`).toString();
			const alternates = SUPPORTED_LANGUAGE_CODES.map(
				(language) =>
					`\t\t<xhtml:link rel="alternate" hreflang="${language}" href="${getLocalizedUrl(language)}" />`,
			).join('\n');

			return [
				'\t<url>',
				`\t\t<loc>${getLocalizedUrl(lang)}</loc>`,
				alternates,
				`\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${getLocalizedUrl('en')}" />`,
				'\t</url>',
			].join('\n');
		}),
	);

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...entries,
		'</urlset>',
	].join('\n');
}

router.get('/sitemap.xml', (_req, res) => {
	res
		.type('application/xml')
		.set('Cache-Control', 'public, max-age=3600')
		.send(getSitemapXml());
});

export default router;
