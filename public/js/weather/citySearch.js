//! public/js/weather/citySearch.js

const CITY_SEARCH_MIN_LENGTH = 3;
const CITY_SEARCH_DEBOUNCE_MS = 1000;
let citySearchTimer = null;
let citySearchController = null;

async function searchCities(query) {
	citySearchController?.abort();
	const controller = new AbortController();
	citySearchController = controller;

	const params = new URLSearchParams({ query });
	const response = await fetch(`/weather/cities?${params.toString()}`, {
		headers: { Accept: 'application/json' },
		signal: controller.signal,
	});

	if (controller.signal.aborted || query !== cityInput?.value.trim()) return;

	if (!response.ok) {
		renderCitySearchError(response.status === 429);
		return;
	}

	const data = await response.json();
	if (controller.signal.aborted || query !== cityInput?.value.trim()) return;
	if (!data?.ok) {
		renderCitySearchError();
		return;
	}

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
		clearCitySelectionError();
		window.clearTimeout(citySearchTimer);
		citySearchController?.abort();
		hideCityResults();

		if (query.length < CITY_SEARCH_MIN_LENGTH) {
			return;
		}

		citySearchTimer = window.setTimeout(() => {
			searchCities(query).catch((error) => {
				if (error.name !== 'AbortError' && query === cityInput.value.trim()) {
					renderCitySearchError();
				}
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
