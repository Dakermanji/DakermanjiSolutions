//! constants/weather.js

export const UNSPLASH_SEARCH_URL = 'https://api.unsplash.com/search/photos';
export const UNSPLASH_REFERRAL_SOURCE = 'dakermanji_solutions_weather';
export const DEFAULT_VIEWPORT_WIDTH = 1600;
export const DEFAULT_VIEWPORT_HEIGHT = 900;
export const MAX_VIEWPORT_SIZE = 3840;

export const WEATHER_BACKGROUND_QUERIES = Object.freeze({
	sunny: 'sunny weather sky',
	cloudy: 'cloudy weather sky',
	rainy: 'rainy weather city',
	stormy: 'stormy weather clouds',
	snowy: 'snowy weather landscape',
	foggy: 'foggy weather landscape',
});

export const OPEN_METEO_GEOCODING_URL =
	'https://geocoding-api.open-meteo.com/v1/search';
export const OPEN_METEO_FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
export const MAX_GEOCODING_RESULTS = 10;
export const MAX_QUALIFIER_CANDIDATES = 100;

export const OPENWEATHER_FORECAST_URL =
	'https://api.openweathermap.org/data/2.5/forecast';
export const OPENWEATHER_REVERSE_GEOCODING_URL =
	'https://api.openweathermap.org/geo/1.0/reverse';
export const FORECAST_DAYS = 5;

export const WEATHER_MASCOT_CONDITIONS = Object.freeze([
	'sunny', 'cloudy', 'rainy', 'stormy', 'snowy',
]);
export const WIND_DIRECTIONS = Object.freeze([
	'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW',
]);

export const SUBDIVISION_NAMES = Object.freeze({
	CA: {
		Quebec: {
			ar: 'كيبيك',
			en: 'Quebec',
			fr: 'Québec',
		},
		Québec: {
			ar: 'كيبيك',
			en: 'Quebec',
			fr: 'Québec',
		},
	},
});
