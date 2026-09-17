//! middlewares/securityHeaders.js

/**
 * Security Headers Middleware
 *
 * Applies HTTP security headers using Helmet.
 * Helmet helps protect the application against common
 * web vulnerabilities by setting secure HTTP headers.
 *
 * The CSP allows only the external resources currently used by the frontend:
 * Bootstrap assets from jsDelivr, Google Fonts, remote weather images, and
 * same-origin Socket.IO connections.
 */

import helmet from 'helmet';
import env from '../config/dotenv.js';

const isProduction = env.NODE_ENV === 'production';
const clientUrl = new URL(env.CLIENT_URL);
const socketOrigin = `${clientUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${clientUrl.host}`;

const contentSecurityPolicy = {
	useDefaults: false,
	directives: {
		defaultSrc: ["'self'"],
		baseUri: ["'none'"],
		connectSrc: [
			"'self'",
			socketOrigin,
			'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css.map',
			'https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js.map',
		],
		fontSrc: [
			"'self'",
			'data:',
			'https://cdn.jsdelivr.net',
			'https://fonts.gstatic.com',
		],
		formAction: ["'self'"],
		frameAncestors: ["'none'"],
		frameSrc: ["'none'"],
		imgSrc: ["'self'", 'data:', 'https://images.unsplash.com'],
		manifestSrc: ["'self'"],
		mediaSrc: ["'self'"],
		objectSrc: ["'none'"],
		scriptSrc: [
			"'self'",
			'https://cdn.jsdelivr.net',
		],
		scriptSrcAttr: ["'none'"],
		styleSrc: [
			"'self'",
			'https://cdn.jsdelivr.net',
			'https://fonts.googleapis.com',
		],
		styleSrcAttr: ["'unsafe-inline'"],
		upgradeInsecureRequests: isProduction ? [] : null,
	},
};

export default function securityHeaders(app) {
	app.use(
		helmet({
			contentSecurityPolicy,
			crossOriginEmbedderPolicy: false,
			crossOriginOpenerPolicy: { policy: 'same-origin' },
			crossOriginResourcePolicy: { policy: 'same-origin' },
			referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
			strictTransportSecurity: isProduction
				? { maxAge: 31_536_000, includeSubDomains: true, preload: false }
				: false,
			xFrameOptions: { action: 'deny' },
		}),
	);

	app.use((req, res, next) => {
		res.setHeader(
			'Permissions-Policy',
			'camera=(), microphone=(), geolocation=(self)',
		);
		next();
	});
}
