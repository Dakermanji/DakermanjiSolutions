//! config/database.js

/**
 * PostgreSQL database configuration
 *
 * Responsibilities:
 * - Create and manage connection pool
 * - Provide a reusable query helper
 * - Expose a connection test function (used at app startup)
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import pg from 'pg';
import env from './dotenv.js';
import logger from './logger.js';

const { Pool } = pg;

/**
 * Build a verified TLS configuration for remote PostgreSQL connections.
 * The custom CA is optional when the server certificate chains to a system CA.
 */
function getSslConfig() {
	if (!env.DB_SSL) return false;

	const ssl = { rejectUnauthorized: true };

	if (env.DB_SSL_CA_PATH) {
		ssl.ca = readFileSync(resolve(env.DB_SSL_CA_PATH), 'utf8');
	}

	return ssl;
}

/**
 * PostgreSQL connection pool
 *
 * Pooling is important because:
 * - Reuses connections (performance)
 * - Prevents creating too many connections
 */
const pool = new Pool({
	host: env.DB_HOST,
	port: env.DB_PORT,
	database: env.DB_NAME,
	user: env.DB_USER,
	password: env.DB_PASSWORD,

	/**
	 * Enable SSL only when required (production / cloud DBs)
	 */
	ssl: getSslConfig(),
});

/**
 * Handle unexpected pool errors
 * (e.g. network issues, DB restart)
 */
pool.on('error', (err) => {
	logger.error(`PostgreSQL pool error: ${err.message}`, {
		type: 'database',
	});
});

/**
 * Execute a SQL query
 *
 * @param {string} text - SQL query
 * @param {Array<any>} params - Query parameters
 * @returns {Promise<import('pg').QueryResult>}
 *
 * Usage:
 *   const result = await query('SELECT * FROM users WHERE id = $1', [id]);
 */
export async function query(text, params = []) {
	return pool.query(text, params);
}

/**
 * Execute a SQL query and return rows only
 *
 * Useful for cleaner model code when
 * query metadata is not needed.
 *
 * @param {string} text - SQL query
 * @param {Array<any>} params - Query parameters
 * @returns {Promise<Array<any>>}
 */
export async function queryRows(text, params = []) {
	const result = await pool.query(text, params);
	return result.rows;
}

/**
 * Test database connection at startup
 *
 * Why:
 * - Fail fast if DB is unreachable
 * - Prevent app from running in broken state
 */
export async function testDatabaseConnection() {
	let client;

	try {
		client = await pool.connect();
		await client.query('SELECT 1');

		logger.success('PostgreSQL connected successfully', {
			type: 'database',
		});
	} catch (err) {
		logger.error(`PostgreSQL connection test failed: ${err.message}`, {
			type: 'database',
		});

		throw err;
	} finally {
		client?.release();
	}
}

export default pool;
