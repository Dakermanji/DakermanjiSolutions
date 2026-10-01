//! services/presence/watch.js

import { presenceState } from './state.js';

export function createPresenceWatchService({
	resolveAudience,
	state = presenceState,
	onError = () => {},
}) {
	const watchers = new Map();
	const byTarget = new Map();
	const pending = new Map();

	function unwatch(socket) {
		const watch = watchers.get(socket.id);
		if (!watch) return;
		watchers.delete(socket.id);
		for (const targetId of watch.targets) {
			const sockets = byTarget.get(targetId);
			sockets?.delete(socket.id);
			if (sockets?.size === 0) byTarget.delete(targetId);
		}
	}

	function register(socket) {
		let generation = 0;
		socket.on('presence:watch', async (payload, acknowledge) => {
			const current = ++generation;
			unwatch(socket);
			try {
				const ids = await resolveAudience(socket.data.userId, payload?.scope, payload?.conversationId);
				if (current !== generation || !socket.connected) return;
				if (!Array.isArray(ids)) {
					if (typeof acknowledge === 'function') acknowledge({ ok: false });
					return;
				}
				const targets = new Set(ids);
				const watch = { socket, scope: payload.scope, conversationId: payload.conversationId, targets };
				watchers.set(socket.id, watch);
				for (const targetId of targets) {
					if (!byTarget.has(targetId)) byTarget.set(targetId, new Set());
					byTarget.get(targetId).add(socket.id);
				}
				if (typeof acknowledge === 'function') {
					acknowledge({ ok: true, statuses: [...targets].map((userId) => ({ userId, status: state.getStatus(userId) })) });
				}
			} catch (error) {
				onError(error, socket.data.userId);
				if (current === generation && typeof acknowledge === 'function') acknowledge({ ok: false });
			}
		});
		socket.on('presence:unwatch', () => { generation++; unwatch(socket); });
		socket.on('disconnect', () => { generation++; unwatch(socket); });
	}

	async function deliver(targetId, status) {
		for (const socketId of [...(byTarget.get(targetId) || [])]) {
			const watch = watchers.get(socketId);
			if (!watch?.socket.connected) continue;
			try {
				const ids = await resolveAudience(watch.socket.data.userId, watch.scope, watch.conversationId);
				if (watchers.get(socketId) !== watch) continue;
				if (!Array.isArray(ids) || !ids.includes(targetId)) {
					unwatch(watch.socket);
					continue;
				}
				watch.socket.emit('presence:peer:changed', { userId: targetId, status });
			} catch (error) {
				onError(error, watch.socket.data.userId);
			}
		}
	}

	function publish(targetId, status) {
		const next = (pending.get(targetId) || Promise.resolve()).then(() => deliver(targetId, status));
		const settled = next.catch(() => {});
		pending.set(targetId, settled);
		settled.then(() => { if (pending.get(targetId) === settled) pending.delete(targetId); });
		return next;
	}

	return { register, publish };
}
