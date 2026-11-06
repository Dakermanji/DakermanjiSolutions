//! controllers/legal.js

/**
 * Render the public privacy policy.
 *
 * @param {import('express').Request} _req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function renderPrivacyPolicy(req, res) {
	res.render('legal/privacy', {
		titleKey: 'legal:privacy.metaTitle',
		metaDescription: req.t('legal:privacy.summary'),
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
export function renderTermsOfService(req, res) {
	res.render('legal/terms', {
		titleKey: 'legal:terms.metaTitle',
		metaDescription: req.t('legal:terms.summary'),
		styles: ['legal/main'],
		scripts: [],
	});
}
