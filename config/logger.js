//! config/logger.js

/**
 * Application logger
 * ------------------
 * Centralized logging system built with Winston.
 *
 * Why this file exists:
 * - keeps logging behavior in one place
 * - standardizes levels, colors, icons, and formatting
 * - makes terminal logs easier to read during development
 *
 * Current features:
 * - custom log levels
 * - custom colors per level
 * - icons for both level and log type
 * - timestamped console output
 * - optional meta logging for extra context
 *
 * Example output:
 * 2026-03-11 10:00:00 ✅ 🚀 [SERVER] Server running on http://localhost:3000
 * 2026-03-11 10:00:02 ✅ 🗄️ [DATABASE] Database connected successfully
 * 2026-03-11 10:00:05 ❌ 🔐 [AUTH] Invalid sign in attempt {"controller":"signupLocal"}
 */

import winston from 'winston';

/**
 * Custom application log levels
 *
 * Lower number = higher priority.
 * This order controls how Winston treats severity.
 */
const customLevels = {
	levels: {
		fatal: 0,
		error: 1,
		warning: 2,
		success: 3,
		info: 4,
		debug: 5,
	},
	colors: {
		fatal: 'magenta',
		error: 'red',
		warning: 'yellow',
		success: 'green',
		info: 'blue',
		debug: 'gray',
	},
};

// Register custom colors so Winston can colorize output by log level
winston.addColors(customLevels.colors);

/**
 * Icons mapped by log level
 *
 * These visually communicate the severity/status
 * of each log entry.
 */
const levelIcons = {
	fatal: '☠️',
	error: '❌',
	warning: '⚠️',
	success: '✅',
	info: 'ℹ️',
	debug: '🛠️',
};

/**
 * Icons mapped by log type/category
 *
 * These help identify which part of the application
 * generated the log message.
 */
const typeIcons = {
	server: '🚀',
	database: '🗄️',
	auth: '🔐',
	routes: '🛣️',
	request: '📡',
	system: '⚙️',
	cache: '🧠',
	mail: '📧',
	files: '📁',
	security: '🛡️',
};

/**
 * Safely stringify extra logger metadata.
 *
 * Notes:
 * - keeps log output compact
 * - ignores empty metadata
 * - falls back safely if JSON serialization fails
 *
 * @param {Object} meta
 * @returns {string}
 */
function formatMeta(meta) {
	if (!meta || Object.keys(meta).length === 0) {
		return '';
	}

	try {
		return ` ${JSON.stringify(meta)}`;
	} catch {
		return ' {"meta":"[unserializable]"}';
	}
}

/**
 * Custom console formatter
 *
 * Output structure:
 * - timestamp
 * - level icon
 * - type icon
 * - uppercase type label
 * - log message
 *
 * If no type is provided, it falls back to "system".
 */
const loggerFormat = winston.format.printf(
	({ level, message, timestamp, type = 'system', ...meta }) => {
		const levelIcon = levelIcons[level] ?? '🟠';
		const typeIcon = typeIcons[type] ?? '📦';
		const upperType = String(type).toUpperCase();
		const metaString = formatMeta(meta);

		return `${timestamp} ${levelIcon} ${typeIcon} [${upperType}] ${message}${metaString}`;
	},
);

/**
 * Central logger instance
 *
 * Default level is set to "debug" so all messages are visible during development.
 */
const logger = winston.createLogger({
	levels: customLevels.levels,
	level: 'debug',
	format: winston.format.combine(
		winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
		loggerFormat,
		winston.format.colorize({ all: true }),
	),
	transports: [
		/**
		 * Console transport
		 *
		 * Sends logs to the terminal.
		 * This is the primary output for development.
		 */
		new winston.transports.Console({
			stderrLevels: ['fatal', 'error'],
		}),
	],
});

export default logger;
