//! controllers/home.js

import { sendContactEmail } from '../services/contact/email.js';
import { fail, success } from '../services/http/response.js';
import { isSafeString, normalizeText } from '../middlewares/validators/common.js';
import logger from '../config/logger.js';
import { getLocale } from '../services/i18n/locale.js';
import { getCountryOptions } from '../services/country/list.js';
import {
	createAvatarStyleOptions,
	getUserAvatarProfile,
} from '../services/avatar/dicebear.js';
import env from '../config/dotenv.js';
import { SUPPORTED_LANGUAGE_CODES } from '../config/languages.js';

/**
 * Home Controller
 *
 * Contains request handlers related to the homepage.
 */

const CONTACT_REDIRECT = '/#contact';
const MAX_CONTACT_SUBJECT_LENGTH = 150;
const MAX_CONTACT_MESSAGE_LENGTH = 2000;

function normalizeSubject(value) {
	return normalizeText(value).replace(/[\r\n]+/g, ' ');
}

/**
 * Render the homepage.
 *
 * Uses the home/main view.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {void}
 */
export function renderHome(req, res) {
	if (req.query?.modal === 'recovery' && !res.locals.modal) {
		res.locals.modal = 'recovery';
	}
	const locale = getLocale(req);
	const signinIdentifier = req.flash('signinIdentifier')[0] || '';
	const signupEmail = req.flash('signupEmail')[0] || '';
	const signupForm = req.flash('signupForm').at(-1) || {};
	const avatarStyleOptions = createAvatarStyleOptions();
	if (signupForm.avatarSeed) {
		const avatar = getUserAvatarProfile(signupForm.avatarSeed);
		const style = avatarStyleOptions.find((option) => option.key === avatar.styleKey);
		if (style) {
			style.options.unshift({
				value: avatar.value,
				background: avatar.background,
				src: avatar.src,
			});
			signupForm.avatarSeed = avatar.value;
		}
	}
	const siteUrl = new URL('/', env.CLIENT_URL).origin;
	const organizationId = `${siteUrl}/#organization`;
	const personId = `${siteUrl}/#behnam-dakermanji`;
	const logoUrl = res.locals.metaImage;
	const structuredData = {
		'@context': 'https://schema.org',
		'@graph': [
			{
				'@type': 'WebSite',
				'@id': `${siteUrl}/#website`,
				url: `${siteUrl}/en`,
				name: env.COMPANY_NAME,
				inLanguage: SUPPORTED_LANGUAGE_CODES,
				publisher: { '@id': organizationId },
			},
			{
				'@type': 'Organization',
				'@id': organizationId,
				name: env.COMPANY_NAME,
				description: req.t('home:metaDescription'),
				url: siteUrl,
				logo: {
					'@type': 'ImageObject',
					url: logoUrl,
					contentUrl: logoUrl,
					width: 512,
					height: 512,
				},
				founder: { '@id': personId },
			},
			{
				'@type': 'Person',
				'@id': personId,
				name: 'Behnam Dakermanji',
				url: `${siteUrl}/en`,
				jobTitle: 'Secure Web and Backend Systems Developer',
				description: req.t('home:metaDescription'),
				address: {
					'@type': 'PostalAddress',
					addressLocality: 'Laval',
					addressRegion: 'Quebec',
					addressCountry: 'CA',
				},
				worksFor: { '@id': organizationId },
			},
		],
	};
	const structuredDataJson = JSON.stringify(structuredData).replace(/</g, '\\u003c');

	res.render('home/main', {
		titleKey: 'home:title',
		metaTitle: req.t('home:metaTitle'),
		metaDescription: req.t('home:metaDescription'),
		structuredDataJson,
		styles: [
			'home/main',
			'home/hero',
			'home/about',
			'home/services',
			'home/portfolio',
			'home/contact',
			'modals/main',
			'modals/auth-tabs',
			'partials/brands',
		],
		scripts: [
			'home/mouseTrailAndFollower',
			'home/portfolio',
			'home/auth/appReturnTo',
			'home/auth/recovery',
			'home/auth/country',
			'home/auth/avatar',
		],
		signinIdentifier,
		signupEmail,
		signupForm,
		token: req.session.token || null,
		countryOptions: getCountryOptions(locale),
		avatarStyleOptions,
	});
}

/**
 * Send a contact form message from the authenticated user.
 *
 * @param {import('express').Request} req - Express request object
 * @param {import('express').Response} res - Express response object
 * @returns {Promise<void>}
 */
export async function sendContactMessage(req, res) {
	try {
		const user = req.user;

		if (!user?.email) {
			return fail(req, res, 'auth:error.auth_required', {
				to: CONTACT_REDIRECT,
			});
		}

		const subject = normalizeSubject(req.body?.subject);
		const message = normalizeText(req.body?.message);

		if (
			!isSafeString(subject, MAX_CONTACT_SUBJECT_LENGTH) ||
			!isSafeString(message, MAX_CONTACT_MESSAGE_LENGTH)
		) {
			return fail(req, res, 'home:contact.form.invalid', {
				to: CONTACT_REDIRECT,
			});
		}

		await sendContactEmail({
			user,
			subject,
			message,
		});

		return success(req, res, 'home:contact.form.success', {
			to: CONTACT_REDIRECT,
		});
	} catch (error) {
		logger.error('Contact email failed', {
			type: 'mail',
			userId: req.user?.id,
			error: error.message,
		});

		return fail(req, res, 'common:error.generic', {
			to: CONTACT_REDIRECT,
		});
	}
}
