//! services/weather/forecast.js

import env from '../../config/dotenv.js';
import { OPENWEATHER_FORECAST_URL } from '../../constants/weather.js';
import { getLanguage } from './locations.js';
import {
	getLocalizedGeocodingLocation,
	getReverseGeocodingLocation,
} from './forecast/location.js';
import { serializeForecast } from './forecast/serialize.js';
import { getDailySunTimes } from './forecast/sunTimes.js';

export class OpenWeatherConfigError extends Error {
	constructor(message = 'OpenWeather API key is not configured') {
		super(message);
		this.name = 'OpenWeatherConfigError';
	}
}

export class OpenWeatherRateLimitError extends Error {
	constructor(message = 'OpenWeather forecast rate limit reached') {
		super(message);
		this.name = 'OpenWeatherRateLimitError';
		this.status = 429;
	}
}

export async function getWeatherForecast({ latitude, longitude, unit, locale }) {
	if (!env.OPENWEATHER_API_KEY) {
		throw new OpenWeatherConfigError();
	}

	const params = new URLSearchParams({
		lat: String(latitude),
		lon: String(longitude),
		units: unit,
		lang: getLanguage(locale),
		appid: env.OPENWEATHER_API_KEY,
	});

	const [response, reverseLocation, sunTimes] = await Promise.all([
		fetch(`${OPENWEATHER_FORECAST_URL}?${params}`),
		getReverseGeocodingLocation({ latitude, longitude, locale }),
		getDailySunTimes({ latitude, longitude }).catch(() => null),
	]);

	if (response.status === 429) {
		throw new OpenWeatherRateLimitError();
	}

	if (!response.ok) {
		throw new Error(`OpenWeather forecast failed: ${response.status}`);
	}

	const location = await getLocalizedGeocodingLocation({
		latitude,
		longitude,
		locale,
		location: reverseLocation,
	});

	return serializeForecast(await response.json(), { locale, unit, location, sunTimes });
}
