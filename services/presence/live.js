//! services/presence/live.js

import {
	PRESENCE_STATUSES,
	PRESENCE_CHECK_INTERVAL_MS,
	PRESENCE_SELECTABLE_STATUSES,
} from '../../constants/presence.js';
import { createPresenceState } from './state.js';

export function getPresenceUserRoom(userId) {
	return `presence:user:${userId}`;
}

/** Owns presence for one Socket.IO server; broadcasts only to the user's sockets. */
export function createPresenceSocketService(
	io,
	{
		loadPreference,
		savePreference,
		onError = () => {},
		state = createPresenceState(),
		schedule = setInterval,
		cancel = clearInterval,
	} = {},
) {
	if (typeof loadPreference !== 'function' || typeof savePreference !== 'function') {
		throw new TypeError('Presence preference storage is required');
	}
	// Serialize preference reads/writes per user, including reconnects.
	const pending = new Map();
	function enqueue(userId, operation) {
		const result = (pending.get(userId) || Promise.resolve()).then(operation);
		const settled = result.catch(() => {});
		pending.set(userId, settled);
		settled.then(() => {
			if (pending.get(userId) === settled) pending.delete(userId);
		});
		return result;
	}
	const publishedStatuses = new Map();
	let timer = null;

	function publish(userId) {
		const status = state.getStatus(userId);
		if (publishedStatuses.get(userId) === status) return;
		publishedStatuses.set(userId, status);
		io.to(getPresenceUserRoom(userId)).emit('presence:changed', { status });
		if (status === PRESENCE_STATUSES.OFFLINE)
			publishedStatuses.delete(userId);
	}

	function stop() {
		if (timer !== null) cancel(timer);
		timer = null;
	}

	function register(socket) {
		const userId = socket.data?.userId;
		if (!userId) return;
		let disconnected = false;
		let ready = false;
		socket.on('disconnect', () => {
			disconnected = true;
			return enqueue(userId, () => {
				if (!ready) return;
				state.disconnect(userId, socket.id);
				publish(userId);
				if (state.getConnectedUserIds().length === 0) stop();
			});
		});
		socket.on('presence:activity', () => {
			if (ready && !disconnected && state.recordActivity(userId, socket.id)) publish(userId);
		});
		socket.on('presence:set', (payload, acknowledge) => {
			const status = payload?.status;
			return enqueue(userId, async () => {
				let ok = false;
				if (ready && !disconnected && PRESENCE_SELECTABLE_STATUSES.includes(status)) {
					try {
						await savePreference(userId, status);
						ok = state.setStatus(userId, socket.id, status);
						if (ok) publish(userId);
					} catch (error) {
						onError(error, userId);
					}
				}
				if (typeof acknowledge === 'function') acknowledge({ ok, status: state.getStatus(userId) });
			});
		});
		return enqueue(userId, async () => {
			if (disconnected) return;
			const preference = await loadPreference(userId);
			if (disconnected) return;
			await socket.join(getPresenceUserRoom(userId));
			if (disconnected) return;
			state.connect(userId, socket.id, preference);
			ready = true;
			// A new tab needs a snapshot even when the user's status did not change.
			if (publishedStatuses.get(userId) === state.getStatus(userId)) {
				socket.emit('presence:changed', {
					status: state.getStatus(userId),
				});
			} else {
				publish(userId);
			}

			if (timer === null) {
				timer = schedule(() => {
					for (const id of state.getConnectedUserIds()) publish(id);
				}, PRESENCE_CHECK_INTERVAL_MS);
				timer.unref?.();
			}
		}).catch((error) => {
			onError(error, userId);
			socket.emit('presence:error');
		});
	}

	return { register, stop };
}
