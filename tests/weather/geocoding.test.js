import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { searchGeocodingCities } from '../../services/weather/geocoding.js';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

const parisTexas = {
	name: 'Paris',
	admin1: 'Texas',
	country: 'United States',
	country_code: 'US',
	latitude: 33.66,
	longitude: -95.55,
	population: 24000,
};
const parisFrance = {
	name: 'Paris',
	admin1: 'Île-de-France',
	country: 'France',
	country_code: 'FR',
	latitude: 48.86,
	longitude: 2.35,
	population: 2100000,
};

test('partial state qualifier finds a city after an exact search misses', async () => {
	const requestedNames = [];
	globalThis.fetch = async (url) => {
		const params = new URL(url).searchParams;
		requestedNames.push(params.get('name'));
		return {
			ok: true,
			json: async () => ({
				results: params.get('name') === 'paris'
					? [parisFrance, parisTexas]
					: [],
			}),
		};
	};

	const cities = await searchGeocodingCities('paris, t', { locale: 'en' });

	assert.deepEqual(requestedNames, ['paris, t', 'paris']);
	assert.equal(cities.length, 1);
	assert.equal(cities[0]?.label, 'Paris, Texas, United States');
});

test('partial English country qualifier works with a French locale', async () => {
	globalThis.fetch = async (url) => ({
		ok: true,
		json: async () => ({
			results: new URL(url).searchParams.get('name') === 'paris'
				? [parisFrance, parisTexas]
				: [],
		}),
	});

	const cities = await searchGeocodingCities('paris, united', { locale: 'fr' });

	assert.deepEqual(cities.map((city) => city.countryCode), ['US']);
});

test('full qualifier uses the exact upstream result without a fallback request', async () => {
	let requests = 0;
	globalThis.fetch = async () => {
		requests += 1;
		return { ok: true, json: async () => ({ results: [parisTexas] }) };
	};

	const cities = await searchGeocodingCities('paris, texas', { locale: 'en' });

	assert.equal(requests, 1);
	assert.equal(cities[0]?.state, 'Texas');
});
