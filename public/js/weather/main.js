//! public/js/weather/main.js

const CITY_SEARCH_MIN_LENGTH = 3;
const CITY_SEARCH_DEBOUNCE_MS = 1000;

const currentLocationButton = document.querySelector(
	'[data-weather-current-location]',
);
const cityInput = document.querySelector('[data-weather-city-input]');
const cityResults = document.querySelector('[data-weather-city-results]');
const weatherClocks = document.querySelectorAll('[data-weather-clock]');

let citySearchTimer = null;
let citySearchController = null;
let activeCityIndex = -1;
let renderedCities = [];
let isSubmittingWeatherForm = false;

function getLocale() {
	return document.documentElement.lang || 'en';
}

function parseCoordinate(value) {
	const coordinate = Number(value);

	return Number.isFinite(coordinate) ? coordinate : null;
}

function isValidLatitude(value) {
	return value !== null && value >= -90 && value <= 90;
}

function isValidLongitude(value) {
	return value !== null && value >= -180 && value <= 180;
}

function hasValidCoordinates(latitude, longitude) {
	return isValidLatitude(latitude) && isValidLongitude(longitude);
}

function getWeatherForm() {
	return cityInput?.closest('form') || currentLocationButton?.closest('form');
}

function getLocationInputs(form) {
	return {
		latitude: form?.querySelector('[data-weather-latitude]'),
		longitude: form?.querySelector('[data-weather-longitude]'),
	};
}

async function saveViewport() {
	const width = window.innerWidth;
	const height = window.innerHeight;

	if (!width || !height) {
		return;
	}

	await fetch('/weather/viewport', {
		method: 'POST',
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ width, height }),
	});
}

async function submitWeatherForm(form) {
	if (!form) return;

	try {
		await saveViewport();
	} catch {
		// Forecasts still work with the default background size.
	}

	isSubmittingWeatherForm = true;
	form.submit();
}

function hideCityResults() {
	if (!cityResults || !cityInput) return;

	cityResults.hidden = true;
	cityResults.replaceChildren();
	cityInput.setAttribute('aria-expanded', 'false');
	activeCityIndex = -1;
	renderedCities = [];
}

function showCityResults() {
	if (!cityResults || !cityInput) return;

	cityResults.hidden = false;
	cityInput.setAttribute('aria-expanded', 'true');
}

function clearSelectedLocation() {
	const inputs = getLocationInputs(getWeatherForm());

	Object.values(inputs).forEach((input) => {
		if (input) input.value = '';
	});
}

function setActiveCity(index) {
	if (!cityResults) return;

	const options = [...cityResults.querySelectorAll('.weather-city-option')];
	activeCityIndex = index;

	options.forEach((option, optionIndex) => {
		option.classList.toggle('is-active', optionIndex === activeCityIndex);
	});

	options[activeCityIndex]?.scrollIntoView({ block: 'nearest' });
}

async function selectCity(city) {
	const form = getWeatherForm();
	const inputs = getLocationInputs(form);

	if (!form || !cityInput || !city) return;

	cityInput.value = city.city || '';

	const latitude = parseCoordinate(city.latitude);
	const longitude = parseCoordinate(city.longitude);

	if (!hasValidCoordinates(latitude, longitude)) return;

	if (inputs.latitude) inputs.latitude.value = latitude;
	if (inputs.longitude) inputs.longitude.value = longitude;

	hideCityResults();
	await submitWeatherForm(form);
}

function getLocaleComma() {
	return document.documentElement.dir === 'rtl' ? '، ' : ', ';
}

function createCityLabelPart(value) {
	const part = document.createElement('span');

	part.className = 'weather-city-option__label-part';
	part.dir = 'auto';
	part.textContent = value;

	return part;
}

function appendCityLabel(label, city) {
	const parts = [city?.city, city?.state, city?.country].filter(Boolean);

	if (!parts.length) {
		label.textContent = city?.label || city?.city || '';
		return;
	}

	parts.forEach((part, index) => {
		if (index > 0) {
			label.append(document.createTextNode(getLocaleComma()));
		}

		label.append(createCityLabelPart(part));
	});
}

function renderNoCityResults() {
	if (!cityResults || !cityInput) return;

	const message = document.createElement('div');

	message.className = 'weather-city-empty';
	message.setAttribute('role', 'status');
	message.textContent = cityResults.dataset.emptyLabel || 'No cities found.';

	cityResults.replaceChildren(message);
	activeCityIndex = -1;
	renderedCities = [];
	cityResults.hidden = false;
	cityInput.setAttribute('aria-expanded', 'true');
}

function createCityOption(city, index) {
	const option = document.createElement('button');
	const flag = document.createElement('span');
	const label = document.createElement('span');

	option.type = 'button';
	option.className = 'weather-city-option';
	option.setAttribute('role', 'option');
	option.addEventListener('click', () => selectCity(city));

	flag.className = `fi fi-${String(city.countryCode || '').toLocaleLowerCase()} weather-city-option__flag`;
	flag.setAttribute('aria-hidden', 'true');

	label.className = 'weather-city-option__label';
	appendCityLabel(label, city);

	option.append(flag, label);

	if (index === activeCityIndex) {
		option.classList.add('is-active');
	}

	return option;
}

function renderCityResults(cities) {
	if (!cityResults || !cityInput) return;

	renderedCities = Array.isArray(cities)
		? cities.filter(Boolean)
		: [];
	activeCityIndex = -1;

	if (!renderedCities.length) {
		renderNoCityResults();
		return;
	}

	try {
		cityResults.replaceChildren(...renderedCities.map(createCityOption));
	} catch {
		hideCityResults();
		return;
	}

	showCityResults();
}

async function searchCities(query) {
	if (citySearchController) {
		citySearchController.abort();
	}

	citySearchController = new AbortController();

	const params = new URLSearchParams({ query });
	const response = await fetch(`/weather/cities?${params.toString()}`, {
		headers: { Accept: 'application/json' },
		signal: citySearchController.signal,
	});

	if (!response.ok) {
		hideCityResults();
		return;
	}

	const data = await response.json();
	const cities = Array.isArray(data?.cities) ? data.cities : [];

	if (!cities.length) {
		renderNoCityResults();
		return;
	}

	renderCityResults(cities);
}

if (cityInput) {
	cityInput.addEventListener('input', () => {
		const query = cityInput.value.trim();

		clearSelectedLocation();
		window.clearTimeout(citySearchTimer);

		if (query.length < CITY_SEARCH_MIN_LENGTH) {
			hideCityResults();
			return;
		}

		citySearchTimer = window.setTimeout(() => {
			searchCities(query).catch((error) => {
				if (error.name !== 'AbortError') hideCityResults();
			});
		}, CITY_SEARCH_DEBOUNCE_MS);
	});

	cityInput.addEventListener('keydown', (event) => {
		if (!renderedCities.length) return;

		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActiveCity(Math.min(activeCityIndex + 1, renderedCities.length - 1));
		}

		if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActiveCity(Math.max(activeCityIndex - 1, 0));
		}

		if (event.key === 'Enter' && activeCityIndex >= 0) {
			event.preventDefault();
			selectCity(renderedCities[activeCityIndex]);
		}

		if (event.key === 'Escape') {
			hideCityResults();
		}
	});

	document.addEventListener('click', (event) => {
		if (!event.target.closest('.weather-search')) {
			hideCityResults();
		}
	});
}

if (currentLocationButton) {
	const form = getWeatherForm();
	const { latitude: latitudeInput, longitude: longitudeInput } =
		getLocationInputs(form);

	currentLocationButton.addEventListener('click', () => {
		if (!navigator.geolocation || !form || !latitudeInput || !longitudeInput) {
			return;
		}

		currentLocationButton.disabled = true;
		currentLocationButton.setAttribute('aria-busy', 'true');

		navigator.geolocation.getCurrentPosition(
			async (position) => {
				const latitude = parseCoordinate(position.coords.latitude);
				const longitude = parseCoordinate(position.coords.longitude);

				if (!hasValidCoordinates(latitude, longitude)) {
					currentLocationButton.disabled = false;
					currentLocationButton.removeAttribute('aria-busy');
					return;
				}

				latitudeInput.value = latitude;
				longitudeInput.value = longitude;
				await submitWeatherForm(form);
			},
			() => {
				currentLocationButton.disabled = false;
				currentLocationButton.removeAttribute('aria-busy');
			},
			{
				enableHighAccuracy: false,
				maximumAge: 300000,
				timeout: 10000,
			},
		);
	});
}

const weatherForm = getWeatherForm();

if (weatherForm) {
	weatherForm.addEventListener('submit', (event) => {
		if (isSubmittingWeatherForm) {
			return;
		}

		event.preventDefault();
		submitWeatherForm(weatherForm);
	});
}

function getOffsetDate(timezoneOffset) {
	return new Date(Date.now() + timezoneOffset * 1000);
}

function formatClockTime(date) {
	return cleanBidiText(new Intl.DateTimeFormat(getLocale(), {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZone: 'UTC',
	}).format(date));
}

function formatClockDate(date) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${year}/${month}/${day}`;
}

function cleanBidiText(value) {
	return String(value).replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
}

function formatTimezoneOffset(timezoneOffset) {
	const sign = timezoneOffset >= 0 ? '+' : '-';
	const absoluteOffset = Math.abs(timezoneOffset);
	const hours = String(Math.floor(absoluteOffset / 3600)).padStart(2, '0');
	const minutes = String(Math.floor((absoluteOffset % 3600) / 60)).padStart(2, '0');

	return `UTC${sign}${hours}:${minutes}`;
}

function updateWeatherClock(clock) {
	const timezoneOffset = Number(clock.dataset.timezoneOffset);
	const time = clock.querySelector('[data-weather-clock-time]');
	const date = clock.querySelector('[data-weather-clock-date]');
	const offset = clock.querySelector('[data-weather-clock-offset]');

	if (!Number.isFinite(timezoneOffset) || !time || !date || !offset) return;

	const now = getOffsetDate(timezoneOffset);
	time.textContent = formatClockTime(now);
	date.textContent = formatClockDate(now);
	offset.textContent = formatTimezoneOffset(timezoneOffset);
}

if (weatherClocks.length) {
	const updateWeatherClocks = () => {
		weatherClocks.forEach(updateWeatherClock);
	};

	updateWeatherClocks();
	window.setInterval(updateWeatherClocks, 1000);
}
