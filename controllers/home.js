//! controllers/home.js

import { sendContactEmail } from '../services/contact/email.js';
import { fail, success } from '../services/http/response.js';
import { isSafeString, normalizeText } from '../middlewares/validators/common.js';
import logger from '../config/logger.js';
import { getLocale } from '../services/i18n/locale.js';
import { getCountryOptions } from '../services/country/list.js';
import { createAvatarStyleOptions } from '../services/avatar/dicebear.js';

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
	const locale = getLocale(req);

	res.render('home/main', {
		titleKey: 'home:title',
		metaTitle: req.t('home:metaTitle'),
		metaDescription: req.t('home:metaDescription'),
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
		scripts: ['home/mouseTrailAndFollower', 'home/portfolio', 'home/auth'],
		token: req.session.token || null,
		countryOptions: getCountryOptions(locale),
		avatarStyleOptions: createAvatarStyleOptions(),
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
