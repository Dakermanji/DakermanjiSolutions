//! public/js/weather/cityResults.js

const cityResults = document.querySelector('[data-weather-city-results]');
let activeCityIndex = -1;
let renderedCities = [];

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

	clearCitySelectionError();
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

function renderCityMessage(text, isError = false) {
	if (!cityResults || !cityInput) return;

	const message = document.createElement('div');

	message.className = isError
		? 'weather-city-empty weather-city-error'
		: 'weather-city-empty';
	message.setAttribute('role', isError ? 'alert' : 'status');
	message.textContent = text;

	cityResults.replaceChildren(message);
	activeCityIndex = -1;
	renderedCities = [];
	cityResults.hidden = false;
	cityInput.setAttribute('aria-expanded', 'true');
}

function renderNoCityResults() {
	renderCityMessage(cityResults?.dataset.emptyLabel || 'No cities found.');
}

function renderCitySearchError(isRateLimited = false) {
	const message = isRateLimited
		? cityResults?.dataset.limitLabel || 'Weather services are busy right now.'
		: cityResults?.dataset.searchErrorLabel || 'City search is unavailable right now.';

	renderCityMessage(message, true);
}

function createCityOption(city, index) {
	const option = document.createElement('button');
	const flag = document.createElement('span');
	const label = document.createElement('span');

	option.type = 'button';
	option.className = 'weather-city-option app-dropdown-option';
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
