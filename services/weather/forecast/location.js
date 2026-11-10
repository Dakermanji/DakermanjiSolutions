//! services/weather/forecast/location.js

import env from '../../../config/dotenv.js';
import { OPENWEATHER_REVERSE_GEOCODING_URL } from '../../../constants/weather.js';
import { findGeocodingCityByCoordinates } from '../geocoding.js';
import {
	cleanPlaceName,
	getCountryName,
	getLanguage,
	getSubdivisionName,
} from '../locations.js';

function getLocalizedName(place, locale) {
	const language = getLanguage(locale);

	return (
		place?.local_names?.[language] ||
		place?.local_names?.en ||
		place?.local_names?.ascii ||
		place?.local_names?.feature_name ||
		place?.name ||
		''
	);
}

export function serializeLocation(place, locale) {
	const countryCode = place?.country || '';

	return {
		city: cleanPlaceName(getLocalizedName(place, locale)),
		state: getSubdivisionName(countryCode, place?.state, locale),
		country: getCountryName(countryCode, locale),
		countryCode,
	};
}

function hasArabicText(value) {
	return /[\u0600-\u06ff]/.test(String(value || ''));
}

function chooseCityName({ currentName, geocodingName, locale }) {
	const current = cleanPlaceName(currentName);
	const geocoding = cleanPlaceName(geocodingName);

	if (getLanguage(locale) === 'ar' && hasArabicText(current)) {
		return current;
	}

	return geocoding || current;
}

export async function getReverseGeocodingLocation({ latitude, longitude, locale }) {
	try {
		const params = new URLSearchParams({
			lat: String(latitude),
			lon: String(longitude),
			limit: '1',
			appid: env.OPENWEATHER_API_KEY,
		});

		const response = await fetch(`${OPENWEATHER_REVERSE_GEOCODING_URL}?${params}`);

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		const place = Array.isArray(data) ? data[0] : null;

		return place ? serializeLocation(place, locale) : null;
	} catch {
		return null;
	}
}

export async function getLocalizedGeocodingLocation({
	latitude,
	longitude,
	locale,
	location,
}) {
	if (!location?.city) {
		return location;
	}

	try {
		const geocodingLocation = await findGeocodingCityByCoordinates(location.city, {
			latitude,
			longitude,
			locale,
			countryCode: location.countryCode,
		});

		return geocodingLocation
			? {
					...geocodingLocation,
					city: chooseCityName({
						currentName: location.city,
						geocodingName: geocodingLocation.city,
						locale,
					}),
				}
			: location;
	} catch {
		return location;
	}
}
