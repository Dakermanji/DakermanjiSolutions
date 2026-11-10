//! services/auth/email.js

import env from '../../config/dotenv.js';
import transporter from '../../config/mailer.js';
import emailContent from './emailContent.js';
import logger from '../../config/logger.js';

/**
 * Send signup email with verification link.
 *
 * @param {string} email
 * @param {string} token
 * @param {string} locale
 * @returns {Promise<void>}
 */
export async function sendSignupEmail(email, token, locale = 'en') {
	const safeLocale = Object.hasOwn(emailContent.signupEmailContent, locale)
		? locale
		: 'en';

	const verifyUrl = `${env.CLIENT_URL}/auth/verify-email?token=${encodeURIComponent(token)}&lang=${safeLocale}`;
	const content = emailContent.signupEmailContent[safeLocale];

	await transporter.sendMail({
		from: env.EMAIL_ADMIN,
		to: email,
		subject: content.subject,
		html: content.html(verifyUrl),
	});

	logger.success('Signup email sent', {
		type: 'mail',
		email: email,
	});
}

/**
 * Send recovery-related email based on intent type.
 *
 * Supported types:
 * - password_reset
 * - resend_verification
 *
 * @param {Object} params
 * @param {'password_reset'|'resend_verification'} params.type
 * @param {string} params.email
 * @param {string} params.token
 * @param {string} params.locale
 * @returns {Promise<void>}
 */
export async function sendRecoveryIntentEmail({
	type,
	email,
	token,
	locale = 'en',
}) {
	let contentMap;
	let url;

	// Select content + URL based on intent type.
	if (type === 'password_reset') {
		contentMap = emailContent.resetPasswordEmailContent;
		url = `${env.CLIENT_URL}/auth/reset-password?token=${encodeURIComponent(token)}&lang=${locale}`;
	} else if (type === 'resend_verification') {
		contentMap = emailContent.signupEmailContent;
		url = `${env.CLIENT_URL}/auth/verify-email?token=${encodeURIComponent(token)}&lang=${locale}`;
	} else {
		logger.warning('Invalid recovery email type', {
			type: 'mail',
			recoveryType: type,
			email,
		});
		return;
	}

	const safeLocale = Object.hasOwn(contentMap, locale) ? locale : 'en';
	const content = contentMap[safeLocale];

	await transporter.sendMail({
		from: env.EMAIL_ADMIN,
		to: email,
		subject: content.subject,
		html: content.html(url),
	});

	logger.success('Recovery email sent', {
		type: 'mail',
		intent: type,
		email,
	});
}

export async function sendAccountDeletionEmail({
	email,
	token,
	locale = 'en',
}) {
	const contentMap = emailContent.accountDeletionEmailContent;
	const safeLocale = Object.hasOwn(contentMap, locale) ? locale : 'en';
	const url = `${env.CLIENT_URL}/auth/delete-account?token=${encodeURIComponent(token)}&lang=${safeLocale}`;
	const content = contentMap[safeLocale];

	await transporter.sendMail({
		from: env.EMAIL_ADMIN,
		to: email,
		subject: content.subject,
		html: content.html(url),
	});

	logger.success('Account deletion email sent', {
		type: 'mail',
		email,
	});
}

export async function sendPasswordChangedEmail(email) {
	const recoveryUrl = new URL('/?modal=recovery', env.CLIENT_URL).toString();
	const contactUrl = new URL('/#contact', env.CLIENT_URL).toString();
	const content = emailContent.passwordChangedEmailContent;

	await transporter.sendMail({
		from: env.EMAIL_ADMIN,
		to: email,
		subject: content.subject,
		html: content.html(recoveryUrl, contactUrl),
		text: content.text(recoveryUrl, contactUrl),
	});

	logger.success('Password change email sent', {
		type: 'mail',
		email,
	});
}

export default {
	sendSignupEmail,
	sendRecoveryIntentEmail,
	sendAccountDeletionEmail,
	sendPasswordChangedEmail,
};
