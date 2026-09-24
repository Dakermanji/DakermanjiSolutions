//! config/views.js

/**
 * View Engine Configuration
 *
 * Configures the template engine used by the application.
 *
 * Responsibilities:
 * - Register the view engine used for rendering templates
 * - Define the directory where view templates are stored
 *
 * The project uses EJS (Embedded JavaScript Templates) to render
 * dynamic HTML pages on the server.
 * express-ejs-layouts to provide layout support.
 *
 * Example usage inside routes:
 * res.render('home', { title: 'Home Page' });
 */

import path from 'path';
import { fileURLToPath } from 'url';
import expressLayouts from 'express-ejs-layouts';

import { SUPPORTED_LANGUAGES } from './languages.js';

/**
 * Resolve the current file path in ES Modules.
 * Node.js does not provide __dirname by default in ES module mode,
 * so we recreate it using fileURLToPath.
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Applies view engine configuration to the Express application.
 *
 * @param {import('express').Express} app - Express application instance
 */
export default function configureViews(app) {
	// Keep the shared layout renderable even when request middleware fails
	// before it can populate res.locals. Request-scoped locals override these.
	Object.assign(app.locals, {
		t: (key) => key,
		currentLang: 'en',
		languages: SUPPORTED_LANGUAGES,
		user: null,
		isAuthenticated: false,
		currentTheme: 'system',
		currentRoute: '',
		currentUrl: '/',
		styles: [],
		scripts: [],
		modal: null,
		navbar: [],
		userAppsNavbar: [],
		notificationUnreadCount: 0,
		notificationPreview: [],
	});

	// Register EJS as the template engine
	app.set('view engine', 'ejs');

	// Define where template files are located
	app.set('views', path.join(__dirname, '../views'));

	// Enable layout support for EJS templates
	app.use(expressLayouts);

	// Define the default layout file
	app.set('layout', 'layouts/main');
}
