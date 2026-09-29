//! services/presence/state.js

export const PRESENCE_IDLE_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Process-local presence state. Callers supply authenticated user/socket IDs.
 * The injected clock lets inactivity be tested without waiting in real time.
 * Manual choices last until the final connection closes; persistent preferences
 * will be restored by the socket layer when persistence is introduced.
 */
export function createPresenceState({ now = Date.now } = {}) {
	const users = new Map();

	function getStatus(userId) {
		const user = users.get(userId);
		if (!user || user.connections.size === 0) return 'offline';
		if (user.manualStatus) return user.manualStatus;
		const cutoff = now() - PRESENCE_IDLE_TIMEOUT_MS;
		return [...user.connections.values()].some((activity) => activity > cutoff)
			? 'online'
			: 'away';
	}

	function connect(userId, connectionId) {
		let user = users.get(userId);
		if (!user) {
			user = { connections: new Map(), manualStatus: null };
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
		if (!['online', 'away', 'busy'].includes(status)) return false;
		const user = users.get(userId);
		if (!user?.connections.has(connectionId)) return false;
		user.manualStatus = status === 'online' ? null : status;
		// Explicitly choosing Online is itself activity.
		if (status === 'online') user.connections.set(connectionId, now());
		return true;
	}

	// The socket layer can poll connected users to detect automatic Away changes.
	function getConnectedUserIds() {
		return [...users.keys()];
	}

	return { connect, disconnect, recordActivity, setStatus, getStatus, getConnectedUserIds };
}
