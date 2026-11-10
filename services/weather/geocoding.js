//! services/weather/geocoding.js

import {
	MAX_GEOCODING_RESULTS,
	MAX_QUALIFIER_CANDIDATES,
	OPEN_METEO_GEOCODING_URL,
} from '../../constants/weather.js';
import {
	cleanPlaceName,
	getCountryName,
	getSubdivisionName,
} from './locations.js';

export class GeocodingRateLimitError extends Error {
	constructor(message = 'Open-Meteo geocoding rate limit reached') {
		super(message);
		this.name = 'GeocodingRateLimitError';
		this.status = 429;
	}
}

function normalizeLimit(limit) {
	const normalizedLimit = Number(limit);

	if (!Number.isInteger(normalizedLimit)) {
		return MAX_GEOCODING_RESULTS;
	}

	return Math.min(Math.max(normalizedLimit, 1), MAX_GEOCODING_RESULTS);
}

function normalizeLanguage(locale) {
	return String(locale || 'en')
		.split('-')[0]
		.toLocaleLowerCase();
}

function normalizeSearchPart(value) {
	return String(value || '')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.trim()
		.toLocaleLowerCase();
}

function matchesQualifier(city, qualifier, locale) {
	const normalizedQualifier = normalizeSearchPart(qualifier);
	const names = [
		city.admin1,
		city.country,
		city.country_code,
		getCountryName(city.country_code, locale),
		getCountryName(city.country_code, 'en'),
	];

	return names.some((name) =>
		normalizeSearchPart(name).startsWith(normalizedQualifier),
	);
}

function getStateName(city) {
	return (
		city.admin1 ||
		city.admin2 ||
		city.admin3 ||
		city.admin4 ||
		''
	);
}

function serializeCity(city, locale) {
	const state = getSubdivisionName(city.country_code, getStateName(city), locale);
	const country = getCountryName(city.country_code, locale);
	const language = String(locale).split('-')[0];
	const comma = language === 'ar' ? '، ' : ', ';

	return {
		city: city.name || '',
		state,
		country,
		countryCode: city.country_code || '',
		latitude: city.latitude,
		longitude: city.longitude,
		population: city.population || 0,
		timezone: city.timezone || '',
		label: [city.name, state, country].filter(Boolean).join(comma),
	};
}

function sortCities(cities, query) {
	const normalizedQuery = cleanPlaceName(query).toLocaleLowerCase();

	return [...cities].sort((a, b) => {
		const aName = cleanPlaceName(a.city).toLocaleLowerCase();
		const bName = cleanPlaceName(b.city).toLocaleLowerCase();
		const aExact = aName === normalizedQuery ? 1 : 0;
		const bExact = bName === normalizedQuery ? 1 : 0;
		const aPrefix = aName.startsWith(normalizedQuery) ? 1 : 0;
		const bPrefix = bName.startsWith(normalizedQuery) ? 1 : 0;

		return (
			(b.population || 0) - (a.population || 0) ||
			bExact - aExact ||
			bPrefix - aPrefix ||
			aName.localeCompare(bName)
		);
	});
}

function getAdministrativeRecordPenalty(city) {
	const name = String(city.city || '').toLocaleLowerCase();

	return /\([^)]*(administrative|region|county|district)[^)]*\)/i.test(name)
		? 1000
		: 0;
}

function getDistanceScore(city, latitude, longitude) {
	const cityLatitude = Number(city.latitude);
	const cityLongitude = Number(city.longitude);

	if (
		!Number.isFinite(cityLatitude) ||
		!Number.isFinite(cityLongitude)
	) {
		return Number.POSITIVE_INFINITY;
	}

	return (
		getAdministrativeRecordPenalty(city) +
		Math.abs(cityLatitude - latitude) +
		Math.abs(cityLongitude - longitude)
	);
}

async function fetchGeocodingCities(query, { locale, count }) {
	const params = new URLSearchParams({
		name: query,
		count: String(count),
		language: normalizeLanguage(locale),
		format: 'json',
	});

	const response = await fetch(`${OPEN_METEO_GEOCODING_URL}?${params}`);

	if (response.status === 429) {
		throw new GeocodingRateLimitError();
	}

	if (!response.ok) {
		throw new Error(`Open-Meteo geocoding failed: ${response.status}`);
	}

	const data = await response.json();
	return Array.isArray(data?.results) ? data.results : [];
}

export async function searchGeocodingCities(
	query,
	{ locale = 'en', limit = 5 } = {},
) {
	const normalizedLimit = normalizeLimit(limit);
	const [cityName, qualifier] = String(query).split(',').map((part) => part.trim());
	const cities = await fetchGeocodingCities(qualifier ? query : cityName, {
		locale,
		count: normalizedLimit,
	});

	if (!qualifier || cities.length) {
		return sortCities(
			cities.map((city) => serializeCity(city, locale)),
			cityName,
		).slice(0, normalizedLimit);
	}

	const candidates = await fetchGeocodingCities(cityName, {
		locale,
		count: MAX_QUALIFIER_CANDIDATES,
	});

	return sortCities(
		candidates
			.filter((city) => matchesQualifier(city, qualifier, locale))
			.map((city) => serializeCity(city, locale)),
		cityName,
	).slice(0, normalizedLimit);
}

export async function findGeocodingCityByCoordinates(
	query,
	{ latitude, longitude, locale = 'en', countryCode = '' } = {},
) {
	const normalizedQuery = cleanPlaceName(query);
	const cities = await searchGeocodingCities(normalizedQuery || query, {
		locale,
		limit: MAX_GEOCODING_RESULTS,
	});
	const normalizedCountryCode = String(countryCode || '').toLocaleUpperCase();
	const matchingCountryCities = normalizedCountryCode
		? cities.filter((city) => city.countryCode === normalizedCountryCode)
		: cities;
	const candidates = matchingCountryCities.length ? matchingCountryCities : cities;

	return [...candidates].sort(
		(a, b) =>
			getDistanceScore(a, latitude, longitude) -
			getDistanceScore(b, latitude, longitude),
	)[0] || null;
}
