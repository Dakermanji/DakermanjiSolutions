//! server.js

/**
 * Application Entry Point
 *
 * Responsibilities:
 * - Initialize critical external services (e.g. database)
 * - Start the HTTP server
 * - Register global process-level error handlers
 *
 * Why this file exists:
 * - Acts as the true runtime bootstrap layer
 * - Keeps side effects (DB, server start) out of config files
 * - Ensures the app fails fast if dependencies are unavailable
 */
import env from './config/dotenv.js';
import registerProcessHandlers from './config/process.js';
import app from './config/express.js';
import { i18nReady } from './config/i18n.js';
import logger from './config/logger.js';
import { testDatabaseConnection } from './config/database.js';
import configureSocket from './config/socket.js';

/**
 * Bootstrap and start the server
 *
 * Steps:
 * 1. Initialize translations
 * 2. Verify database connection
 * 3. Start HTTP server
 * 4. Attach global process error handlers
 *
 * If any critical step fails, the process exits.
 */
async function startServer() {
	try {
		/**
		 * Finish loading translations before accepting requests.
		 * Keeping this await inside startup lets synchronous hosting loaders
		 * import the ESM module graph without ERR_REQUIRE_ASYNC_MODULE.
		 */
		await i18nReady;

		/**
		 * Ensure database is reachable before starting the app
		 *
		 * This prevents the server from running in a broken state
		 * where requests would fail due to missing DB connection.
		 */
		await testDatabaseConnection();

		/**
		 * Start HTTP server
		 */
		const server = app.listen(env.PORT, () => {
			logger.success(`Server running on ${env.CLIENT_URL}`, {
				type: 'server',
			});
		});

		configureSocket(server);

		/**
		 * Register global process-level error handlers
		 *
		 * Handles:
		 * - Uncaught exceptions
		 * - Unhandled promise rejections
		 * - Graceful shutdown
		 */
		registerProcessHandlers(server);
	} catch (err) {
		/**
		 * If initialization fails (e.g. DB down),
		 * log the error and terminate the process.
		 */
		logger.error(`Failed to start server: ${err.message}`, {
			type: 'server',
		});

		process.exit(1);
	}
}

/**
 * Execute bootstrap
 */
startServer();
