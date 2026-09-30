//! services/presence/state.js

import {
	PRESENCE_IDLE_TIMEOUT_MS,
	PRESENCE_STATUSES,
	PRESENCE_SELECTABLE_STATUSES,
} from '../../constants/presence.js';

/**
 * Process-local presence state. Callers supply authenticated user/socket IDs.
 * The injected clock lets inactivity be tested without waiting in real time.
 * The socket layer restores the saved preference on the first connection.
 * In-memory state is released when the final connection closes.
 */
export function createPresenceState({ now = Date.now } = {}) {
	const users = new Map();

	function getStatus(userId) {
		const user = users.get(userId);
		if (!user || user.connections.size === 0)
			return PRESENCE_STATUSES.OFFLINE;
		if (user.manualStatus) return user.manualStatus;
		const cutoff = now() - PRESENCE_IDLE_TIMEOUT_MS;
		return [...user.connections.values()].some(
			(activity) => activity > cutoff,
		)
			? PRESENCE_STATUSES.ONLINE
			: PRESENCE_STATUSES.AWAY;
	}

	function connect(userId, connectionId, preference = PRESENCE_STATUSES.ONLINE) {
		let user = users.get(userId);
		if (!user) {
			user = {
				connections: new Map(),
				manualStatus: [PRESENCE_STATUSES.AWAY, PRESENCE_STATUSES.BUSY].includes(preference) ? preference : null,
			};
			users.set(userId, user);
		}
		// Registering the same socket twice must not count as new activity.
		if (!user.connections.has(connectionId)) {
			user.connections.set(connectionId, now());
		}
		return getStatus(userId);
	}

	function disconnect(userId, connectionId) {
		const user = users.get(userId);
		if (user) {
			user.connections.delete(connectionId);
			if (user.connections.size === 0) users.delete(userId);
		}
		return getStatus(userId);
	}

	function recordActivity(userId, connectionId) {
		const user = users.get(userId);
		if (!user?.connections.has(connectionId)) return false;
		user.connections.set(connectionId, now());
		return true;
	}

	function setStatus(userId, connectionId, status) {
		if (!PRESENCE_SELECTABLE_STATUSES.includes(status)) return false;
		const user = users.get(userId);
		if (!user?.connections.has(connectionId)) return false;
		user.manualStatus = status === PRESENCE_STATUSES.ONLINE ? null : status;
		// Explicitly choosing Online is itself activity.
		if (status === PRESENCE_STATUSES.ONLINE)
			user.connections.set(connectionId, now());
		return true;
	}

	// The socket layer can poll connected users to detect automatic Away changes.
	function getConnectedUserIds() {
		return [...users.keys()];
	}

	return {
		connect,
		disconnect,
		recordActivity,
		setStatus,
		getStatus,
		getConnectedUserIds,
	};
}
