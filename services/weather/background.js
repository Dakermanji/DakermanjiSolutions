//! services/weather/background.js

import env from '../../config/dotenv.js';
import {
	DEFAULT_VIEWPORT_HEIGHT,
	DEFAULT_VIEWPORT_WIDTH,
	MAX_VIEWPORT_SIZE,
	UNSPLASH_REFERRAL_SOURCE,
	UNSPLASH_SEARCH_URL,
	WEATHER_BACKGROUND_QUERIES,
} from '../../constants/weather.js';

export class UnsplashRateLimitError extends Error {
	constructor(message = 'Unsplash background rate limit reached') {
		super(message);
		this.name = 'UnsplashRateLimitError';
		this.status = 429;
	}
}

function clampViewportSize(value, fallback) {
	const size = Number(value);

	if (!Number.isFinite(size) || size <= 0) {
		return fallback;
	}

	return Math.min(Math.round(size), MAX_VIEWPORT_SIZE);
}

function getOrientation(width, height) {
	if (height > width) return 'portrait';
	if (width > height) return 'landscape';

	return 'squarish';
}

function getConditionQuery(condition) {
	return WEATHER_BACKGROUND_QUERIES[condition] || 'weather sky';
}

function getCroppedImageUrl(photo, { width, height }) {
	const rawUrl = photo?.urls?.raw;

	if (!rawUrl) {
		return '';
	}

	const url = new URL(rawUrl);
	url.searchParams.set('w', String(width));
	url.searchParams.set('h', String(height));
	url.searchParams.set('fit', 'crop');
	url.searchParams.set('crop', 'entropy');
	url.searchParams.set('q', '80');

	return url.toString();
}

function getReferralUrl(value) {
	if (!value) {
		return '';
	}

	const url = new URL(value);
	url.searchParams.set('utm_source', UNSPLASH_REFERRAL_SOURCE);
	url.searchParams.set('utm_medium', 'referral');

	return url.toString();
}

function getPhotoCredit(photo) {
	const photographerName = photo?.user?.name || '';
	const photographerUrl = getReferralUrl(photo?.user?.links?.html);

	if (!photographerName || !photographerUrl) {
		return null;
	}

	return {
		photographerName,
		photographerUrl,
		unsplashUrl: getReferralUrl('https://unsplash.com/'),
	};
}

async function trackPhotoDownload(photo) {
	const downloadLocation = photo?.links?.download_location;

	if (!downloadLocation) {
		return false;
	}

	const url = new URL(downloadLocation);
	url.searchParams.set('client_id', env.UNSPLASH_ACCESS_KEY);

	const response = await fetch(url);

	if (response.status === 429) {
		throw new UnsplashRateLimitError();
	}

	return response.ok;
}

export function normalizeViewport(viewport = {}) {
	const width = clampViewportSize(viewport.width, DEFAULT_VIEWPORT_WIDTH);
	const height = clampViewportSize(viewport.height, DEFAULT_VIEWPORT_HEIGHT);

	return {
		width,
		height,
		orientation: getOrientation(width, height),
	};
}

export async function getWeatherBackground({ condition, viewport } = {}) {
	if (!env.UNSPLASH_ACCESS_KEY) {
		return null;
	}

	const normalizedViewport = normalizeViewport(viewport);
	const params = new URLSearchParams({
		client_id: env.UNSPLASH_ACCESS_KEY,
		query: getConditionQuery(condition),
		orientation: normalizedViewport.orientation,
		per_page: '1',
		content_filter: 'high',
	});

	const response = await fetch(`${UNSPLASH_SEARCH_URL}?${params}`);

	if (response.status === 429) {
		throw new UnsplashRateLimitError();
	}

	if (!response.ok) {
		return null;
	}

	const data = await response.json();
	const photo = Array.isArray(data?.results) ? data.results[0] : null;
	const imageUrl = getCroppedImageUrl(photo, normalizedViewport);
	const credit = getPhotoCredit(photo);

	if (!imageUrl || !credit) {
		return null;
	}

	const tracked = await trackPhotoDownload(photo);

	if (!tracked) {
		return null;
	}

	return {
		imageUrl,
		credit,
	};
}
