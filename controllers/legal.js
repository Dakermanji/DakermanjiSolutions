//! controllers/legal.js

/**
 * Render the public privacy policy.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function renderPrivacyPolicy(_req, res) {
	res.render('legal/privacy', {
		titleKey: 'legal:privacy.metaTitle',
		styles: ['legal/main'],
		scripts: [],
	});
}

/**
 * Render the public Terms of Service.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function renderTermsOfService(_req, res) {
	res.render('legal/terms', {
		titleKey: 'legal:terms.metaTitle',
		styles: ['legal/main'],
		scripts: [],
	});
}
