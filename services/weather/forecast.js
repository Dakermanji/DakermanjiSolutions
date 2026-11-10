//! services/weather/forecast.js

import env from '../../config/dotenv.js';
import {
	FORECAST_DAYS,
	OPENWEATHER_FORECAST_URL,
	OPENWEATHER_REVERSE_GEOCODING_URL,
	WEATHER_MASCOT_CONDITIONS,
	WIND_DIRECTIONS,
} from '../../constants/weather.js';
import { findGeocodingCityByCoordinates } from './geocoding.js';
import { getDailySunTimes } from './sunTimes.js';
import {
	cleanPlaceName,
	getCountryName,
	getLanguage,
	getSubdivisionName,
} from './locations.js';

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

function round(value) {
	const number = Number(value);
	return Number.isFinite(number) ? Math.round(number) : null;
}

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

function serializeLocation(place, locale) {
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

function getLocalDateKey(timestamp, timezoneOffset) {
	return new Date((timestamp + timezoneOffset) * 1000)
		.toISOString()
		.slice(0, 10);
}

function getLocalHour(timestamp, timezoneOffset) {
	return new Date((timestamp + timezoneOffset) * 1000).getUTCHours();
}

function formatTime(timestamp, timezoneOffset, locale, timeZone = 'UTC') {
	if (
		timestamp === null ||
		timestamp === undefined ||
		!Number.isFinite(Number(timestamp))
	) {
		return '';
	}

	const adjustedTimestamp = Number(timestamp) +
		(timeZone === 'UTC' ? timezoneOffset : 0);

	return new Intl.DateTimeFormat(locale, {
		hour: 'numeric',
		minute: '2-digit',
		timeZone,
	}).format(new Date(adjustedTimestamp * 1000));
}

function getSunTime(dateKey, kind, { sunTimes, city, timezoneOffset, locale }) {
	const dailyTimes = sunTimes?.byDate.get(dateKey);

	if (dailyTimes) {
		return formatTime(dailyTimes[kind], 0, locale, sunTimes.timeZone);
	}

	const fallback = city?.[kind];
	return fallback && getLocalDateKey(fallback, timezoneOffset) === dateKey
		? formatTime(fallback, timezoneOffset, locale)
		: '';
}

function getDayLabel(dateKey, todayKey) {
	const dayNumber =
		Math.round((Date.parse(dateKey) - Date.parse(todayKey)) / 86_400_000) + 1;

	if (dayNumber === 1) return { labelKey: 'today' };
	if (dayNumber === 2) return { labelKey: 'tomorrow' };

	return {
		labelKey: 'day',
		dayNumber,
	};
}

function getWeatherIcon(weatherMain, weatherId) {
	if (weatherId >= 200 && weatherId < 300) return 'bi-cloud-lightning-rain-fill';
	if (weatherId >= 300 && weatherId < 600) return 'bi-cloud-rain-heavy-fill';
	if (weatherId >= 600 && weatherId < 700) return 'bi-cloud-snow-fill';
	if (weatherId >= 700 && weatherId < 800) return 'bi-cloud-haze2-fill';
	if (weatherId === 800) return 'bi-sun-fill';
	if (weatherId > 800) return 'bi-cloud-sun-fill';

	const condition = String(weatherMain || '').toLowerCase();
	if (condition.includes('rain')) return 'bi-cloud-rain-heavy-fill';
	if (condition.includes('snow')) return 'bi-cloud-snow-fill';
	if (condition.includes('thunder')) return 'bi-cloud-lightning-rain-fill';
	if (condition.includes('cloud')) return 'bi-cloud-sun-fill';

	return 'bi-cloud-fill';
}

function getConditionName(weatherMain) {
	const condition = String(weatherMain || '').toLowerCase();

	if (condition.includes('thunder')) return 'stormy';
	if (condition.includes('snow')) return 'snowy';
	if (condition.includes('rain') || condition.includes('drizzle')) return 'rainy';
	if (condition.includes('cloud')) return 'cloudy';
	if (condition.includes('clear')) return 'sunny';
	if (condition.includes('mist') || condition.includes('fog')) return 'foggy';

	return condition || 'weather';
}

function getMascotImage(condition) {
	const mascotCondition = WEATHER_MASCOT_CONDITIONS.includes(condition) ? condition : 'default';

	return `/images/weather/maple-coder-weather-${mascotCondition}.png`;
}

function getWindSpeed(value, unit) {
	const speed = Number(value);
	if (!Number.isFinite(speed)) return null;

	return unit === 'metric' ? round(speed * 3.6) : round(speed);
}

function getVisibility(value, unit) {
	const visibility = Number(value);
	if (!Number.isFinite(visibility)) return null;

	return unit === 'metric' ? round(visibility / 1000) : round(visibility / 1609.344);
}

function getDirection(degrees) {
	const value = Number(degrees);
	if (!Number.isFinite(value)) return '';

	const index = Math.round(value / 45) % WIND_DIRECTIONS.length;

	return WIND_DIRECTIONS[index];
}

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

function serializeForecast(data, { locale, unit, location = null, sunTimes = null }) {
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

async function getReverseGeocodingLocation({ latitude, longitude, locale }) {
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

async function getLocalizedGeocodingLocation({
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
