//! public/js/chat/conversation-page/roomPresence.js

(() => {
	function createRoomPresenceController({ panel, conversationId }) {
		if (!panel || !conversationId) return { sync() {}, stop() {} };
		const labels = JSON.parse(panel.dataset.presenceLabels || '{}');
		let timer = null;
		let request = null;
		let generation = 0;

		function visible() {
			return !panel.hidden && document.visibilityState === 'visible';
		}

		function applyMembers(members) {
			const statuses = new Map(members.map((member) => [member.id, member.status]));
			for (const dot of panel.querySelectorAll('[data-chat-member-presence]')) {
				const reported = statuses.get(dot.dataset.chatMemberPresence);
				const status = Object.hasOwn(labels, reported) ? reported : 'offline';
				const label = labels[status] || 'Offline';
				dot.dataset.status = status;
				dot.dataset.bsTitle = label;
				dot.setAttribute('aria-label', label);
				window.bootstrap?.Tooltip.getInstance(dot)?.setContent({ '.tooltip-inner': label });
			}
			window.AppTooltips?.initIn(panel);
		}

		async function refresh() {
			if (!visible() || request) return;
			const currentGeneration = generation;
			const controller = new AbortController();
			request = controller;
			try {
				const url = `${panel.dataset.presenceUrl}?conversationId=${encodeURIComponent(conversationId)}`;
				const response = await fetch(url, {
					headers: { Accept: 'application/json' },
					credentials: 'same-origin',
					signal: controller.signal,
				});
				if (!response.ok) throw new Error(`Presence request failed: ${response.status}`);
				const payload = await response.json();
				if (!payload?.ok || !Array.isArray(payload.members)) throw new Error('Invalid presence response');
				if (currentGeneration === generation && visible()) applyMembers(payload.members);
			} catch (error) {
				if (error.name !== 'AbortError') console.error('Failed to load room presence', error);
			} finally {
				if (request === controller) request = null;
			}
		}

		function stop() {
			generation++;
			window.clearInterval(timer);
			timer = null;
			request?.abort();
			request = null;
		}

		function sync() {
			stop();
			if (!visible()) return;
			void refresh();
			timer = window.setInterval(refresh, 60_000);
		}

		document.addEventListener('visibilitychange', sync);
		return { sync, stop };
	}

	window.ChatConversationRoomPresence = { createRoomPresenceController };
})();
