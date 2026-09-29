//! services/presence/live.js

import { PRESENCE_STATUSES } from '../../constants/presence.js';
import { createPresenceState } from './state.js';

export const PRESENCE_CHECK_INTERVAL_MS = 15_000;

export function getPresenceUserRoom(userId) {
	return `presence:user:${userId}`;
}

/** Owns presence for one Socket.IO server; broadcasts only to the user's sockets. */
export function createPresenceSocketService(io, {
	state = createPresenceState(),
	schedule = setInterval,
	cancel = clearInterval,
} = {}) {
	const publishedStatuses = new Map();
	let timer = null;

	function publish(userId) {
		const status = state.getStatus(userId);
		if (publishedStatuses.get(userId) === status) return;
		publishedStatuses.set(userId, status);
		io.to(getPresenceUserRoom(userId)).emit('presence:changed', { status });
		if (status === PRESENCE_STATUSES.OFFLINE) publishedStatuses.delete(userId);
	}

	function stop() {
		if (timer !== null) cancel(timer);
		timer = null;
	}

	function register(socket) {
		const userId = socket.data?.userId;
		if (!userId) return;
		socket.join(getPresenceUserRoom(userId));
		state.connect(userId, socket.id);
		// A new tab needs a snapshot even when the user's status did not change.
		if (publishedStatuses.get(userId) === state.getStatus(userId)) {
			socket.emit('presence:changed', { status: state.getStatus(userId) });
		} else {
			publish(userId);
		}

		if (timer === null) {
			timer = schedule(() => {
				for (const id of state.getConnectedUserIds()) publish(id);
			}, PRESENCE_CHECK_INTERVAL_MS);
			timer.unref?.();
		}

		socket.on('presence:activity', () => {
			if (state.recordActivity(userId, socket.id)) publish(userId);
		});

		socket.on('presence:set', (payload, acknowledge) => {
			const ok = state.setStatus(userId, socket.id, payload?.status);
			if (ok) publish(userId);
			if (typeof acknowledge === 'function') {
				acknowledge({ ok, status: state.getStatus(userId) });
			}
		});

		socket.on('disconnect', () => {
			state.disconnect(userId, socket.id);
			publish(userId);
			if (state.getConnectedUserIds().length === 0) stop();
		});
	}

	return { register, stop };
}
