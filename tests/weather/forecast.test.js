import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

for (const key of [
	'SESSION_SECRET',
	'EMAIL_ADMIN',
	'EMAIL_PASSWORD',
	'EMAIL_SERVICE',
	'EMAIL_HOST',
	'DB_PASSWORD',
	'GOOGLE_CLIENT_ID',
	'GOOGLE_CLIENT_SECRET',
	'GOOGLE_CALLBACK_URL',
	'GITHUB_CLIENT_ID',
	'GITHUB_CLIENT_SECRET',
	'GITHUB_CALLBACK_URL',
	'DISCORD_CLIENT_ID',
	'DISCORD_CLIENT_SECRET',
	'DISCORD_CALLBACK_URL',
]) {
	process.env[key] ||= 'test';
}
process.env.OPENWEATHER_API_KEY = 'test';
process.env.NODE_ENV = 'production';

const { getWeatherForecast } = await import('../../services/weather/forecast.js');
const originalFetch = globalThis.fetch;
const originalNow = Date.now;

afterEach(() => {
	globalThis.fetch = originalFetch;
	Date.now = originalNow;
});

function forecastEntry(timestamp) {
	return {
		dt: Date.parse(timestamp) / 1000,
		main: { temp: 20, feels_like: 20, temp_min: 19, temp_max: 21 },
		weather: [{ main: 'Clear', id: 800, description: 'clear sky' }],
	};
}

function forecastPayload(timezone, timestamps) {
	return {
		city: {
			name: 'Paris',
			country: 'FR',
			timezone,
			sunrise: Date.parse('2026-11-10T06:00:00Z') / 1000,
			sunset: Date.parse('2026-11-10T16:00:00Z') / 1000,
		},
		list: timestamps.map(forecastEntry),
	};
}

test('labels the first forecast day tomorrow when local midnight comes first', async () => {
	Date.now = () => Date.parse('2026-11-10T21:30:00Z');
	globalThis.fetch = async (url) => ({
		ok: true,
		json: async () => url.includes('/data/2.5/forecast')
			? forecastPayload(7200, [
				'2026-11-10T22:00:00Z',
				'2026-11-11T22:00:00Z',
			])
			: [],
	});

	const forecast = await getWeatherForecast({
		latitude: 48.86,
		longitude: 2.35,
		unit: 'metric',
		locale: 'en',
	});

	assert.deepEqual(
		forecast.forecastDays.map(({ labelKey, dayNumber }) => ({ labelKey, dayNumber })),
		[
			{ labelKey: 'tomorrow', dayNumber: undefined },
			{ labelKey: 'day', dayNumber: 3 },
		],
	);
});

test('uses distinct sunrise and sunset times for each forecast date', async () => {
	Date.now = () => Date.parse('2026-11-10T10:00:00Z');
	globalThis.fetch = async (url) => ({
		ok: true,
		json: async () => {
			if (url.includes('/data/2.5/forecast')) {
				return forecastPayload(0, [
					'2026-11-10T12:00:00Z',
					'2026-11-11T12:00:00Z',
				]);
			}
			if (url.includes('api.open-meteo.com')) {
				return {
					timezone: 'Europe/Paris',
					utc_offset_seconds: 3600,
					daily: {
						time: [
							Date.parse('2026-11-09T23:00:00Z') / 1000,
							Date.parse('2026-11-10T23:00:00Z') / 1000,
						],
						sunrise: [
							Date.parse('2026-11-10T06:00:00Z') / 1000,
							Date.parse('2026-11-11T06:05:00Z') / 1000,
						],
						sunset: [
							Date.parse('2026-11-10T16:00:00Z') / 1000,
							Date.parse('2026-11-11T15:58:00Z') / 1000,
						],
					},
				};
			}
			return [];
		},
	});

	const { forecastDays } = await getWeatherForecast({
		latitude: 48.86,
		longitude: 2.35,
		unit: 'metric',
		locale: 'en',
	});

	assert.notEqual(forecastDays[0].sunrise, forecastDays[1].sunrise);
	assert.notEqual(forecastDays[0].sunset, forecastDays[1].sunset);
	assert.match(forecastDays[1].sunrise, /7:05/);
	assert.match(forecastDays[1].sunset, /4:58/);
});

test('does not repeat current sun times when the daily lookup fails', async () => {
	Date.now = () => Date.parse('2026-11-10T10:00:00Z');
	globalThis.fetch = async (url) => {
		if (url.includes('api.open-meteo.com')) return { ok: false, status: 503 };
		return {
			ok: true,
			json: async () => url.includes('/data/2.5/forecast')
				? forecastPayload(0, [
					'2026-11-10T12:00:00Z',
					'2026-11-11T12:00:00Z',
				])
				: [],
		};
	};

	const { forecastDays } = await getWeatherForecast({
		latitude: 48.86,
		longitude: 2.35,
		unit: 'metric',
		locale: 'en',
	});

	assert.ok(forecastDays[0].sunrise);
	assert.ok(forecastDays[0].sunset);
	assert.equal(forecastDays[1].sunrise, '');
	assert.equal(forecastDays[1].sunset, '');
});
