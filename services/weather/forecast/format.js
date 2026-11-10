//! services/weather/forecast/format.js

import {
	WEATHER_MASCOT_CONDITIONS,
	WIND_DIRECTIONS,
} from '../../../constants/weather.js';

export function round(value) {
	const number = Number(value);
	return Number.isFinite(number) ? Math.round(number) : null;
}

export function getLocalDateKey(timestamp, timezoneOffset) {
	return new Date((timestamp + timezoneOffset) * 1000)
		.toISOString()
		.slice(0, 10);
}

export function getLocalHour(timestamp, timezoneOffset) {
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

export function getSunTime(dateKey, kind, { sunTimes, city, timezoneOffset, locale }) {
	const dailyTimes = sunTimes?.byDate.get(dateKey);

	if (dailyTimes) {
		return formatTime(dailyTimes[kind], 0, locale, sunTimes.timeZone);
	}

	const fallback = city?.[kind];
	return fallback && getLocalDateKey(fallback, timezoneOffset) === dateKey
		? formatTime(fallback, timezoneOffset, locale)
		: '';
}

export function getDayLabel(dateKey, todayKey) {
	const dayNumber =
		Math.round((Date.parse(dateKey) - Date.parse(todayKey)) / 86_400_000) + 1;

	if (dayNumber === 1) return { labelKey: 'today' };
	if (dayNumber === 2) return { labelKey: 'tomorrow' };

	return {
		labelKey: 'day',
		dayNumber,
	};
}

export function getWeatherIcon(weatherMain, weatherId) {
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

export function getConditionName(weatherMain) {
	const condition = String(weatherMain || '').toLowerCase();

	if (condition.includes('thunder')) return 'stormy';
	if (condition.includes('snow')) return 'snowy';
	if (condition.includes('rain') || condition.includes('drizzle')) return 'rainy';
	if (condition.includes('cloud')) return 'cloudy';
	if (condition.includes('clear')) return 'sunny';
	if (condition.includes('mist') || condition.includes('fog')) return 'foggy';

	return condition || 'weather';
}

export function getMascotImage(condition) {
	const mascotCondition = WEATHER_MASCOT_CONDITIONS.includes(condition) ? condition : 'default';

	return `/images/weather/maple-coder-weather-${mascotCondition}.png`;
}

export function getWindSpeed(value, unit) {
	const speed = Number(value);
	if (!Number.isFinite(speed)) return null;

	return unit === 'metric' ? round(speed * 3.6) : round(speed);
}

export function getVisibility(value, unit) {
	const visibility = Number(value);
	if (!Number.isFinite(visibility)) return null;

	return unit === 'metric' ? round(visibility / 1000) : round(visibility / 1609.344);
}

export function getDirection(degrees) {
	const value = Number(degrees);
	if (!Number.isFinite(value)) return '';

	const index = Math.round(value / 45) % WIND_DIRECTIONS.length;

	return WIND_DIRECTIONS[index];
}
