//! public/js/chat/conversation-page/roomPresence.js

(() => {
	function createRoomPresenceController({ panel, conversationId }) {
		if (!panel || !conversationId) return { sync() {}, setSocket() {} };
		const labels = JSON.parse(panel.dataset.presenceLabels || '{}');
		let socket = null;
		let generation = 0;

		function visible() {
			return !panel.hidden && document.visibilityState === 'visible';
		}

		function update(userId, reported) {
			if (!visible()) return;
			const status = Object.hasOwn(labels, reported) ? reported : 'offline';
			const label = labels[status] || 'Offline';
			for (const dot of panel.querySelectorAll('[data-chat-member-presence]')) {
				if (dot.dataset.chatMemberPresence !== userId) continue;
				dot.dataset.status = status;
				dot.dataset.bsTitle = label;
				dot.setAttribute('aria-label', label);
				window.bootstrap?.Tooltip.getInstance(dot)?.setContent({ '.tooltip-inner': label });
			}
		}

		function sync() {
			generation++;
			if (!socket?.connected || !visible()) {
				socket?.emit('presence:unwatch');
				return;
			}
			const current = generation;
			socket.emit('presence:watch', { scope: 'room-members', conversationId }, (result) => {
				if (current !== generation || !visible() || !result?.ok) return;
				for (const item of result.statuses || []) update(item.userId, item.status);
				window.AppTooltips?.initIn(panel);
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

	window.ChatConversationRoomPresence = { createRoomPresenceController };
})();
