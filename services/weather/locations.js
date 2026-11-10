//! services/weather/locations.js

import { SUBDIVISION_NAMES } from '../../constants/weather.js';

export function getLanguage(locale) {
	return String(locale || 'en')
		.split('-')[0]
		.toLocaleLowerCase();
}

export function cleanPlaceName(value) {
	return String(value || '')
		.replace(/\s*\([^)]*\)\s*/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function getCountryName(countryCode, locale) {
	if (!countryCode) return '';

	try {
		const displayNames = new Intl.DisplayNames([locale || 'en'], {
			type: 'region',
		});

		return displayNames.of(countryCode) || countryCode;
	} catch {
		return countryCode;
	}
}

export function getSubdivisionName(countryCode, subdivisionName, locale) {
	const country = String(countryCode || '').toLocaleUpperCase();
	const subdivision = String(subdivisionName || '').trim();

	if (!country || !subdivision) {
		return subdivision;
	}

	const language = getLanguage(locale);
	const names = SUBDIVISION_NAMES[country]?.[subdivision];

	return names?.[language] || names?.en || subdivision;
}
