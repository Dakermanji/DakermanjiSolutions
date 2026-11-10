//! services/weather/forecast/sunTimes.js

import { OPEN_METEO_FORECAST_URL } from '../../../constants/weather.js';

export async function getDailySunTimes({ latitude, longitude }) {
	const params = new URLSearchParams({
		latitude: String(latitude),
		longitude: String(longitude),
		daily: 'sunrise,sunset',
		timezone: 'auto',
		timeformat: 'unixtime',
		forecast_days: '6',
	});
	const response = await fetch(`${OPEN_METEO_FORECAST_URL}?${params}`, {
		signal: AbortSignal.timeout(4000),
	});

	if (!response.ok) {
		throw new Error(`Open-Meteo sun times failed: ${response.status}`);
	}

	const data = await response.json();
	if (
		typeof data?.timezone !== 'string' ||
		!Array.isArray(data?.daily?.time) ||
		!Array.isArray(data.daily.sunrise) ||
		!Array.isArray(data.daily.sunset)
	) {
		throw new Error('Open-Meteo sun times response is incomplete');
	}
	new Intl.DateTimeFormat('en', { timeZone: data.timezone });

	const dates = data.daily.time;
	const sunrises = data.daily.sunrise;
	const sunsets = data.daily.sunset;
	const byDate = new Map();

	dates.forEach((date, index) => {
		if (!Number.isFinite(date)) return;

		const dateKey = new Date((date + (data.utc_offset_seconds || 0)) * 1000)
			.toISOString()
			.slice(0, 10);
		byDate.set(dateKey, {
			sunrise: sunrises[index],
			sunset: sunsets[index],
		});
	});

	return { timeZone: data.timezone, byDate };
}
