//! middlewares/validators/weather.js

import { fail } from '../../services/http/response.js';

const WEATHER_REDIRECT = '/weather';
const WEATHER_UNITS = new Set(['metric', 'imperial']);
const MAX_VIEWPORT_SIZE = 3840;

function parseCoordinate(value) {
	if (value === undefined || value === null || value === '') {
		return null;
	}

	const coordinate = Number(value);

	return Number.isFinite(coordinate) ? coordinate : null;
}

function isLatitude(value) {
	return value >= -90 && value <= 90;
}

function isLongitude(value) {
	return value >= -180 && value <= 180;
}

function normalizeUnit(value) {
	return WEATHER_UNITS.has(value) ? value : 'metric';
}

function normalizeViewportSize(value) {
	const size = Number(value);

	if (!Number.isFinite(size) || size <= 0) {
		return null;
	}

	return Math.min(Math.round(size), MAX_VIEWPORT_SIZE);
}

function getSessionViewport(req) {
	return {
		width: normalizeViewportSize(req.session?.weatherViewport?.width),
		height: normalizeViewportSize(req.session?.weatherViewport?.height),
	};
}

export function validateWeatherQuery(req, res, next) {
	const latitude = parseCoordinate(req.query?.latitude);
	const longitude = parseCoordinate(req.query?.longitude);
	const hasLatitude = req.query?.latitude !== undefined && req.query?.latitude !== '';
	const hasLongitude =
		req.query?.longitude !== undefined && req.query?.longitude !== '';
	const unit = normalizeUnit(req.query?.unit);
	const viewport = getSessionViewport(req);

	if (!hasLatitude && !hasLongitude) {
		req.weather = { unit, viewport };
		return next();
	}

	if (
		!hasLatitude ||
		!hasLongitude ||
		latitude === null ||
		longitude === null ||
		!isLatitude(latitude) ||
		!isLongitude(longitude)
	) {
		return fail(req, res, 'weather:error.invalid_location', {
			to: WEATHER_REDIRECT,
		});
	}

	req.weather = {
		latitude,
		longitude,
		unit,
		viewport,
	};

	return next();
}
