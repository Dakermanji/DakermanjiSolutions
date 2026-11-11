//! public/js/weather/main.js

const currentLocationButton = document.querySelector(
	'[data-weather-current-location]',
);
const cityInput = document.querySelector('[data-weather-city-input]');
const citySelectionError = document.querySelector('[data-weather-city-error]');
let isSubmittingWeatherForm = false;

function parseCoordinate(value) {
	if (value === '' || value === null || value === undefined) return null;

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

function hasSelectedLocation(form) {
	const { latitude, longitude } = getLocationInputs(form);

	return hasValidCoordinates(
		parseCoordinate(latitude?.value),
		parseCoordinate(longitude?.value),
	);
}

function clearCitySelectionError() {
	if (citySelectionError) citySelectionError.hidden = true;
	cityInput?.removeAttribute('aria-invalid');
}

function showCitySelectionError() {
	if (citySelectionError) citySelectionError.hidden = false;
	cityInput?.setAttribute('aria-invalid', 'true');
	cityInput?.focus();
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
	if (!form || isSubmittingWeatherForm) return;
	if (!hasSelectedLocation(form)) {
		showCitySelectionError();
		return;
	}

	clearCitySelectionError();
	isSubmittingWeatherForm = true;

	try {
		await saveViewport();
	} catch {
		// Forecasts still work with the default background size.
	}

	if (!hasSelectedLocation(form)) {
		isSubmittingWeatherForm = false;
		return;
	}

	form.submit();
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
		event.preventDefault();
		submitWeatherForm(weatherForm);
	});

	weatherForm.querySelectorAll('input[name="unit"]').forEach((unitInput) => {
		unitInput.addEventListener('change', () => {
			if (cityInput?.value.trim()) return;

			const latitude = parseCoordinate(weatherForm.dataset.weatherForecastLatitude);
			const longitude = parseCoordinate(weatherForm.dataset.weatherForecastLongitude);
			if (!hasValidCoordinates(latitude, longitude)) return;

			const inputs = getLocationInputs(weatherForm);
			if (!inputs.latitude || !inputs.longitude) return;

			inputs.latitude.value = latitude;
			inputs.longitude.value = longitude;
			submitWeatherForm(weatherForm);
		});
	});
}
