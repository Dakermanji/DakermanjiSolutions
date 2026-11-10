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

test('labels the first forecast day tomorrow when local midnight comes first', async () => {
	Date.now = () => Date.parse('2026-11-10T21:30:00Z');
	globalThis.fetch = async (url) => ({
		ok: true,
		json: async () => url.includes('/data/2.5/forecast')
			? {
				city: {
					name: 'Paris',
					country: 'FR',
					timezone: 7200,
					sunrise: Date.parse('2026-11-10T06:00:00Z') / 1000,
					sunset: Date.parse('2026-11-10T16:00:00Z') / 1000,
				},
				list: [
					forecastEntry('2026-11-10T22:00:00Z'),
					forecastEntry('2026-11-11T22:00:00Z'),
				],
			}
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
