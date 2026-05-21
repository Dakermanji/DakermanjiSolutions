//! controllers/weather/main.js

import logger from '../../config/logger.js';
import {
	checkExternalApiQuota,
	recordExternalApiRequest,
} from '../../services/apiUsage/quota.js';
import { fail } from '../../services/http/response.js';
import { getLocale } from '../../services/i18n/locale.js';
import {
	getWeatherBackground,
	UnsplashRateLimitError,
} from '../../services/weather/background.js';
import {
	getWeatherForecast,
	OpenWeatherConfigError,
	OpenWeatherRateLimitError,
} from '../../services/weather/forecast.js';

const WEATHER_PROVIDER = 'weather';
const WEATHER_REQUEST_KEY = 'forecast';
const BACKGROUND_PROVIDER = 'unsplash';
const BACKGROUND_REQUEST_KEY = 'background';
const WEATHER_REDIRECT = '/weather';
const MAX_VIEWPORT_SIZE = 3840;

const emptyLocation = {
	city: '',
	state: '',
	country: '',
	countryCode: '',
};

function renderWeatherView(req, res, { location = emptyLocation, forecastDays = [] } = {}) {
	res.render('weather/main', {
		titleKey: 'weather:title',
		styles: ['weather/main'],
		scripts: ['weather/main'],
		location,
		unit: req.weather?.unit || 'metric',
		forecastDays,
	});
}

function normalizeViewportSize(value) {
	const size = Number(value);

	if (!Number.isFinite(size) || size <= 0) {
		return null;
	}

	return Math.min(Math.round(size), MAX_VIEWPORT_SIZE);
}

export function saveWeatherViewport(req, res) {
	const width = normalizeViewportSize(req.body?.width);
	const height = normalizeViewportSize(req.body?.height);

	if (width && height) {
		req.session.weatherViewport = { width, height };
	}

	return res.sendStatus(204);
}

async function attachWeatherBackground(req, forecast) {
	const activeDay = forecast.forecastDays?.[0];

	if (!activeDay) {
		return forecast;
	}

	const quota = await checkExternalApiQuota(req, {
		provider: BACKGROUND_PROVIDER,
		requestKey: BACKGROUND_REQUEST_KEY,
	});

	if (!quota.allowed) {
		return forecast;
	}

	try {
		const background = await getWeatherBackground({
			condition: activeDay.condition,
			viewport: req.weather?.viewport,
		});

		if (!background?.imageUrl) {
			logger.info('Weather background image unavailable', {
				type: 'weather',
				condition: activeDay.condition,
			});
			return forecast;
		}

		await recordExternalApiRequest(req, {
			provider: BACKGROUND_PROVIDER,
			requestKey: BACKGROUND_REQUEST_KEY,
			responseStatus: 200,
		});

		return {
			...forecast,
			forecastDays: forecast.forecastDays.map((day, index) => ({
				...day,
				backgroundImage: index === 0 ? background.imageUrl : day.backgroundImage,
				backgroundCredit:
					index === 0 ? background.credit : day.backgroundCredit,
			})),
		};
	} catch (error) {
		if (error instanceof UnsplashRateLimitError) {
			await recordExternalApiRequest(req, {
				provider: BACKGROUND_PROVIDER,
				requestKey: BACKGROUND_REQUEST_KEY,
				responseStatus: 429,
				errorCode: 'upstream_rate_limit',
			});
		} else {
			logger.warning('Weather background lookup failed', {
				type: 'weather',
				error: error.message,
			});
		}

		return forecast;
	}
}

export async function renderWeather(req, res) {
	if (
		typeof req.weather?.latitude !== 'number' ||
		typeof req.weather?.longitude !== 'number'
	) {
		return renderWeatherView(req, res);
	}

	try {
		const quota = await checkExternalApiQuota(req, {
			provider: WEATHER_PROVIDER,
			requestKey: WEATHER_REQUEST_KEY,
		});

		if (!quota.allowed) {
			return fail(req, res, 'weather:error.api_limit_reached', {
				to: WEATHER_REDIRECT,
			});
		}

		const forecast = await getWeatherForecast({
			latitude: req.weather.latitude,
			longitude: req.weather.longitude,
			unit: req.weather.unit,
			locale: getLocale(req),
		});
		const enrichedForecast = await attachWeatherBackground(req, forecast);

		await recordExternalApiRequest(req, {
			provider: WEATHER_PROVIDER,
			requestKey: WEATHER_REQUEST_KEY,
			responseStatus: 200,
		});

		return renderWeatherView(req, res, enrichedForecast);
	} catch (error) {
		if (error instanceof OpenWeatherRateLimitError) {
			await recordExternalApiRequest(req, {
				provider: WEATHER_PROVIDER,
				requestKey: WEATHER_REQUEST_KEY,
				responseStatus: 429,
				errorCode: 'upstream_rate_limit',
			});

			return fail(req, res, 'weather:error.api_limit_reached', {
				to: WEATHER_REDIRECT,
			});
		}

		const flashKey =
			error instanceof OpenWeatherConfigError
				? 'weather:error.api_not_configured'
				: 'weather:error.forecast_failed';

		logger.error('Weather forecast failed', {
			type: 'weather',
			error: error.message,
		});

		return fail(req, res, flashKey, {
			to: WEATHER_REDIRECT,
		});
	}
}
