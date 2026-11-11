//! public/js/weather/clock.js

const weatherClocks = document.querySelectorAll('[data-weather-clock]');

function getLocale() {
	return document.documentElement.lang || 'en';
}

function getOffsetDate(timezoneOffset) {
	return new Date(Date.now() + timezoneOffset * 1000);
}

function formatClockTime(date) {
	return cleanBidiText(new Intl.DateTimeFormat(getLocale(), {
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false,
		timeZone: 'UTC',
	}).format(date));
}

function formatClockDate(date) {
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, '0');
	const day = String(date.getUTCDate()).padStart(2, '0');

	return `${year}/${month}/${day}`;
}

function cleanBidiText(value) {
	return String(value).replace(/[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/g, '');
}

function formatTimezoneOffset(timezoneOffset) {
	const sign = timezoneOffset >= 0 ? '+' : '-';
	const absoluteOffset = Math.abs(timezoneOffset);
	const hours = String(Math.floor(absoluteOffset / 3600)).padStart(2, '0');
	const minutes = String(Math.floor((absoluteOffset % 3600) / 60)).padStart(2, '0');

	return `UTC${sign}${hours}:${minutes}`;
}

function updateWeatherClock(clock) {
	const timezoneOffset = Number(clock.dataset.timezoneOffset);
	const time = clock.querySelector('[data-weather-clock-time]');
	const date = clock.querySelector('[data-weather-clock-date]');
	const offset = clock.querySelector('[data-weather-clock-offset]');

	if (!Number.isFinite(timezoneOffset) || !time || !date || !offset) return;

	const now = getOffsetDate(timezoneOffset);
	time.textContent = formatClockTime(now);
	date.textContent = formatClockDate(now);
	offset.textContent = formatTimezoneOffset(timezoneOffset);
}

if (weatherClocks.length) {
	const updateWeatherClocks = () => {
		weatherClocks.forEach(updateWeatherClock);
	};

	updateWeatherClocks();
	window.setInterval(updateWeatherClocks, 1000);
}
