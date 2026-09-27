import { performance } from 'node:perf_hooks';
import { appendFile } from 'node:fs';
import env from '../config/dotenv.js';

const timingKey = Symbol('requestTiming');
const logFile = new URL('../request-timing.log', import.meta.url);
let reportedWriteError = false;

function writeTiming(entry) {
	const line = `[REQUEST_TIMING] ${JSON.stringify({
		timestamp: new Date().toISOString(),
		...entry,
	})}`;
	console.info(line);
	appendFile(logFile, `${line}\n`, { encoding: 'utf8', mode: 0o600 }, (error) => {
		if (error && !reportedWriteError) {
			reportedWriteError = true;
			console.error('[REQUEST_TIMING] Could not write diagnostic file:', error.code);
		}
	});
}

// Opt-in diagnostics: log durations only, never URLs, cookies, or user data.
export function startRequestTiming(app) {
	if (!env.REQUEST_TIMING) return;
	writeTiming({ event: 'enabled' });
	app.use((req, res, next) => {
		const started = performance.now();
		const timing = { started, previous: started, stages: {} };
		req[timingKey] = timing;
		res.once('finish', () => {
			const now = performance.now();
			writeTiming({
				method: req.method,
				status: res.statusCode,
				...timing.stages,
				routeAndResponseMs: Math.round(now - timing.previous),
				totalMs: Math.round(now - timing.started),
			});
		});
		next();
	});
}

export function markRequestTiming(app, stage) {
	if (!env.REQUEST_TIMING) return;
	app.use((req, res, next) => {
		const timing = req[timingKey];
		const now = performance.now();
		timing.stages[stage] = Math.round(now - timing.previous);
		timing.previous = now;
		next();
	});
}
