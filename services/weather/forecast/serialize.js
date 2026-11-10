//! services/weather/forecast/serialize.js

import { FORECAST_DAYS } from '../../../constants/weather.js';
import {
	getConditionName,
	getDayLabel,
	getDirection,
	getLocalDateKey,
	getLocalHour,
	getMascotImage,
	getSunTime,
	getVisibility,
	getWeatherIcon,
	getWindSpeed,
	round,
} from './format.js';
import { serializeLocation } from './location.js';

function getRepresentativeEntry(entries, timezoneOffset) {
	return entries.reduce((selected, entry) => {
		const selectedDistance = Math.abs(getLocalHour(selected.dt, timezoneOffset) - 12);
		const entryDistance = Math.abs(getLocalHour(entry.dt, timezoneOffset) - 12);

		return entryDistance < selectedDistance ? entry : selected;
	}, entries[0]);
}

function sumVolume(entries, key) {
	return entries.reduce((total, entry) => {
		const volume = Number(entry?.[key]?.['3h']);
		return total + (Number.isFinite(volume) ? volume : 0);
	}, 0);
}

function serializeDay(entries, label, { locale, unit, timezoneOffset, sunrise, sunset }) {
	const representative = getRepresentativeEntry(entries, timezoneOffset);
	const weather = representative.weather?.[0] || {};
	const rainVolume = sumVolume(entries, 'rain');
	const snowVolume = sumVolume(entries, 'snow');
	const condition = getConditionName(weather.main);

	return {
		id: label.labelKey === 'day' ? `day-${label.dayNumber}` : label.labelKey,
		...label,
		condition,
		icon: getWeatherIcon(weather.main, weather.id),
		temp: round(representative.main?.temp),
		feelsLike: round(representative.main?.feels_like),
		high: round(Math.max(...entries.map((entry) => Number(entry.main?.temp_max)))),
		low: round(Math.min(...entries.map((entry) => Number(entry.main?.temp_min)))),
		pressure: round(representative.main?.pressure),
		cloudiness: round(representative.clouds?.all),
		visibility: getVisibility(representative.visibility, unit),
		visibilityUnit: unit === 'metric' ? 'km' : 'mi',
		timezoneOffset,
		sunrise,
		sunset,
		windDirection: getDirection(representative.wind?.deg),
		windGust: getWindSpeed(representative.wind?.gust, unit),
		windUnit: unit === 'metric' ? 'km/h' : 'mph',
		precipitation:
			rainVolume > 0 || snowVolume > 0
				? {
						type: snowVolume > rainVolume ? 'snow' : 'rain',
						volume: Math.round(Math.max(rainVolume, snowVolume) * 10) / 10,
					}
				: null,
		description: weather.description || '',
		summary: weather.description || weather.main || '',
		humidity: round(representative.main?.humidity),
		wind: getWindSpeed(representative.wind?.speed, unit),
		backgroundImage: '',
		mascotImage: getMascotImage(condition),
	};
}

export function serializeForecast(data, { locale, unit, location = null, sunTimes = null }) {
	const timezoneOffset = Number(data.city?.timezone) || 0;
	const todayKey = getLocalDateKey(Date.now() / 1000, timezoneOffset);
	const groupedEntries = new Map();

	for (const entry of data.list || []) {
		const dateKey = getLocalDateKey(entry.dt, timezoneOffset);
		const entries = groupedEntries.get(dateKey) || [];

		entries.push(entry);
		groupedEntries.set(dateKey, entries);
	}

	const forecastDays = [...groupedEntries.entries()]
		.slice(0, FORECAST_DAYS)
		.map(([dateKey, entries]) =>
			serializeDay(entries, getDayLabel(dateKey, todayKey), {
				locale,
				unit,
				timezoneOffset,
				sunrise: getSunTime(dateKey, 'sunrise', {
					sunTimes, city: data.city, timezoneOffset, locale,
				}),
				sunset: getSunTime(dateKey, 'sunset', {
					sunTimes, city: data.city, timezoneOffset, locale,
				}),
			}),
		);

	return {
		location:
			location ||
			serializeLocation(
				{
					name: data.city?.name,
					country: data.city?.country,
				},
				locale,
			),
		forecastDays,
	};
}
