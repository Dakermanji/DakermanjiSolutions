//! middlewares/staticFiles.js

/**
 * Static Files Middleware
 *
 * Serves public assets directly through Express.
 *
 * Static files include:
 * - CSS stylesheets
 * - JavaScript files
 * - Images
 * - Fonts
 * - Client-side libraries
 *
 * These assets are stored in the project's `public` directory
 * and are accessible directly by the browser.
 *
 * Example:
 * /public/css/style.css  →  http://localhost:3000/css/style.css
 */

import express from 'express';
import { readFileSync } from 'node:fs';
import env from '../config/dotenv.js';

const robotsRules = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');

/**
 * Registers the static file middleware.
 *
 * @param {import('express').Express} app - Express application instance
 */
export default function staticFiles(app) {
	app.get('/robots.txt', (_req, res) => {
		const sitemapUrl = new URL('/sitemap.xml', new URL('/', env.CLIENT_URL)).toString();
		const robotsBody = robotsRules
			.replace(/^Sitemap:.*\r?\n?/gim, '')
			.trimEnd();

		res
			.type('text/plain')
			.set('Cache-Control', 'public, max-age=3600')
			.send(`${robotsBody}\n\nSitemap: ${sitemapUrl}\n`);
	});

	/**
	 * Serve files from the "public" directory.
	 * Express will automatically map file paths to URLs.
	 */
	app.use(express.static('public'));

	app.use('/vendor/flag-icons', express.static('node_modules/flag-icons'));
}
