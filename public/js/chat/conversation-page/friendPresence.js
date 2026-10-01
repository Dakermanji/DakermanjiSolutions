//! public/js/chat/conversation-page/friendPresence.js

(() => {
	function createFriendPresenceController({ dot, conversationId }) {
		if (!dot || !conversationId) return { sync() {}, setSocket() {} };
		const labels = JSON.parse(dot.dataset.presenceLabels || '{}');
		const friendId = dot.dataset.chatConversationFriendPresence;
		let socket = null;
		let generation = 0;

		function update(userId, reported) {
			if (document.visibilityState !== 'visible' || userId !== friendId) return;
			const status = Object.hasOwn(labels, reported) ? reported : 'offline';
			const label = labels[status] || 'Offline';
			dot.dataset.status = status;
			dot.dataset.bsTitle = label;
			dot.setAttribute('aria-label', label);
			window.bootstrap?.Tooltip.getInstance(dot)?.setContent({ '.tooltip-inner': label });
		}

		function sync() {
			generation++;
			if (!socket?.connected) return;
			if (document.visibilityState !== 'visible') {
				socket.emit('presence:unwatch');
				return;
			}
			const current = generation;
			socket.emit('presence:watch', { scope: 'chat-friend', conversationId }, (result) => {
				if (current !== generation || !socket.connected || !result?.ok) return;
				for (const item of result.statuses || []) update(item.userId, item.status);
			});
		}

		function setSocket(value) {
			socket = value;
			socket?.on('presence:peer:changed', (payload) => update(payload?.userId, payload?.status));
			if (socket?.connected) sync();
		}

		document.addEventListener('visibilitychange', sync);
		return { sync, setSocket };
	}

	window.ChatConversationFriendPresence = { createFriendPresenceController };
})();
