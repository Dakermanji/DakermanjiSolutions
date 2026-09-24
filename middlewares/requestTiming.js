import { performance } from 'node:perf_hooks';
import env from '../config/dotenv.js';

const timingKey = Symbol('requestTiming');

// Opt-in diagnostics: log durations only, never URLs, cookies, or user data.
export function startRequestTiming(app) {
	if (!env.REQUEST_TIMING) return;
	app.use((req, res, next) => {
		const started = performance.now();
		const timing = { started, previous: started, stages: {} };
		req[timingKey] = timing;
		res.once('finish', () => {
			const now = performance.now();
			console.info('[REQUEST_TIMING]', JSON.stringify({
				method: req.method,
				status: res.statusCode,
				...timing.stages,
				routeAndResponseMs: Math.round(now - timing.previous),
				totalMs: Math.round(now - timing.started),
			}));
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
