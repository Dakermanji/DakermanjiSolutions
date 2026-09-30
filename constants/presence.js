//! constants/presence.js

// Stable application values; user-facing labels will come from locale files.
export const PRESENCE_STATUSES = Object.freeze({
	ONLINE: 'online',
	OFFLINE: 'offline',
	AWAY: 'away',
	BUSY: 'busy',
});

export const PRESENCE_CHECK_INTERVAL_MS = 15_000;
export const PRESENCE_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

// Offline is determined by connections, never selected manually.
export const PRESENCE_SELECTABLE_STATUSES = Object.freeze([
	PRESENCE_STATUSES.ONLINE,
	PRESENCE_STATUSES.AWAY,
	PRESENCE_STATUSES.BUSY,
]);
