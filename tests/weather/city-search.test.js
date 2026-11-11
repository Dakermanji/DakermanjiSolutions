import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const scripts = [
	'public/js/weather/main.js',
	'public/js/weather/cityResults.js',
	'public/js/weather/citySearch.js',
	'public/js/weather/clock.js',
].map((path) => readFileSync(path, 'utf8'));

function createPage(fetch) {
	let searchTimer = null;
	const inputListeners = {};
	const cityInput = {
		value: 'Paris',
		closest: () => form,
		addEventListener: (name, listener) => { inputListeners[name] = listener; },
		setAttribute() {},
		removeAttribute() {},
	};
	const cityResults = {
		dataset: {
			emptyLabel: 'No cities found.',
			limitLabel: 'Search limit reached.',
			searchErrorLabel: 'City search unavailable.',
		},
		hidden: true,
		children: [],
		replaceChildren(...children) { this.children = children; },
	};
	const form = {
		querySelector: () => ({ value: '' }),
		querySelectorAll: () => [],
		addEventListener() {},
	};
	const document = {
		querySelector(selector) {
			if (selector === '[data-weather-city-input]') return cityInput;
			if (selector === '[data-weather-city-results]') return cityResults;
			return null;
		},
		querySelectorAll: () => [],
		addEventListener() {},
		createElement: () => ({
			setAttribute(name, value) { this[name] = value; },
		}),
	};
	const window = {
		clearTimeout: () => { searchTimer = null; },
		setTimeout: (callback) => { searchTimer = callback; },
	};

	const context = vm.createContext({ document, window, fetch, URLSearchParams, AbortController, Intl, Date });
	scripts.forEach((script) => vm.runInContext(script, context));

	return {
		cityResults,
		search: async () => {
			inputListeners.input();
			searchTimer();
			await new Promise((resolve) => setImmediate(resolve));
		},
	};
}

test('city search reports rate limits separately from no matches', async () => {
	const limited = createPage(async () => ({ ok: false, status: 429 }));
	await limited.search();
	assert.equal(limited.cityResults.children[0]?.textContent, 'Search limit reached.');
	assert.equal(limited.cityResults.children[0]?.role, 'alert');

	const empty = createPage(async () => ({ ok: true, json: async () => ({ ok: true, cities: [] }) }));
	await empty.search();
	assert.equal(empty.cityResults.children[0]?.textContent, 'No cities found.');
	assert.equal(empty.cityResults.children[0]?.role, 'status');
});

test('city search reports server and network failures', async () => {
	for (const fetch of [
		async () => ({ ok: false, status: 503 }),
		async () => { throw new Error('Network failed'); },
	]) {
		const page = createPage(fetch);
		await page.search();
		assert.equal(page.cityResults.children[0]?.textContent, 'City search unavailable.');
		assert.equal(page.cityResults.hidden, false);
	}
});
