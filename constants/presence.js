//! constants/presence.js

// Stable application values; user-facing labels will come from locale files.
export const PRESENCE_STATUSES = Object.freeze({
	ONLINE: 'online',
	OFFLINE: 'offline',
	AWAY: 'away',
	BUSY: 'busy',
});

// Offline is determined by connections, never selected manually.
export const PRESENCE_SELECTABLE_STATUSES = Object.freeze([
	PRESENCE_STATUSES.ONLINE,
	PRESENCE_STATUSES.AWAY,
	PRESENCE_STATUSES.BUSY,
]);
