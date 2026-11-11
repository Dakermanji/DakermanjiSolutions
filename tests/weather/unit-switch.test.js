import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const script = readFileSync('public/js/weather/main.js', 'utf8');

function createPage({ forecastLatitude = '', forecastLongitude = '', city = '' } = {}) {
	const submissions = [];
	const latitude = { value: '' };
	const longitude = { value: '' };
	const cityError = { hidden: true };
	const unitInputs = [{ listeners: {} }, { listeners: {} }];
	const formListeners = {};
	const cityListeners = {};
	const form = {
		dataset: { weatherForecastLatitude: forecastLatitude, weatherForecastLongitude: forecastLongitude },
		querySelector(selector) {
			return selector === '[data-weather-latitude]' ? latitude : longitude;
		},
		querySelectorAll: () => unitInputs,
		addEventListener: (name, listener) => { formListeners[name] = listener; },
		submit: () => submissions.push({ latitude: String(latitude.value), longitude: String(longitude.value) }),
	};
	const cityInput = {
		value: city,
		closest: () => form,
		addEventListener: (name, listener) => { cityListeners[name] = listener; },
		setAttribute() {},
		removeAttribute() {},
		focus() {},
	};
	unitInputs.forEach((input) => {
		input.addEventListener = (name, listener) => { input.listeners[name] = listener; };
	});
	const document = {
		querySelector(selector) {
			if (selector === '[data-weather-city-input]') return cityInput;
			if (selector === '[data-weather-city-error]') return cityError;
			return null;
		},
		querySelectorAll: () => [],
		addEventListener() {},
	};
	const window = { innerWidth: 1000, innerHeight: 800 };
	let viewportRequests = 0;
	const fetch = async () => {
		viewportRequests += 1;
		return { ok: true };
	};

	vm.runInNewContext(script, { document, window, fetch, URLSearchParams, AbortController, Intl, Date });

	return {
		submissions,
		cityError,
		cityInput,
		formListeners,
		unitInputs,
		getViewportRequests: () => viewportRequests,
	};
}

test('changing units reloads the displayed forecast at its saved coordinates', async () => {
	const page = createPage({ forecastLatitude: '0', forecastLongitude: '-73.5' });

	page.unitInputs[1].listeners.change();
	await new Promise((resolve) => setImmediate(resolve));

	assert.deepEqual(page.submissions, [{ latitude: '0', longitude: '-73.5' }]);
	assert.equal(page.getViewportRequests(), 1);
});

test('an empty page keeps the unit choice without submitting a forecast', () => {
	const page = createPage();

	page.unitInputs[1].listeners.change();

	assert.deepEqual(page.submissions, []);
	assert.equal(page.getViewportRequests(), 0);
});

test('typing a city still requires selecting a result before submission', () => {
	const page = createPage({ forecastLatitude: '48.86', forecastLongitude: '2.35', city: 'Paris' });
	let prevented = false;

	page.unitInputs[1].listeners.change();
	page.formListeners.submit({ preventDefault: () => { prevented = true; } });

	assert.equal(prevented, true);
	assert.equal(page.cityError.hidden, false);
	assert.deepEqual(page.submissions, []);
});
