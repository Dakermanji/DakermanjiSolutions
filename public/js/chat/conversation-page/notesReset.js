//! public/js/chat/conversation-page/notesReset.js

(() => {
	function createNotesResetController({ chatPage, messageSurface, resetForm, reload }) {
		if (chatPage?.dataset.chatConversationKind !== 'self') return null;

		let isSubmittingReset = false;
		let isChecking = false;
		let isReloading = false;

		resetForm?.addEventListener('submit', () => {
			isSubmittingReset = true;
		});

		function reloadNotes() {
			if (isSubmittingReset || isReloading) return;
			isReloading = true;
			reload();
		}

		function handleReset(payload) {
			if (
				payload?.conversationId !== chatPage.dataset.activeConversationId
			) {
				return;
			}

			reloadNotes();
		}

		async function checkForMissedReset() {
			if (isSubmittingReset || isReloading || isChecking) return;
			const messageId = messageSurface?.querySelector('[data-chat-message-id]')
				?.dataset.chatMessageId;
			if (!messageId) return;

			isChecking = true;
			try {
				const params = new URLSearchParams({ messageId });
				const response = await fetch(`/chat/notes/message-status?${params}`, {
					headers: { Accept: 'application/json' },
					credentials: 'same-origin',
					cache: 'no-store',
				});
				if (!response.ok) return;
				const status = await response.json();
				if (
					status?.ok && status.exists === false &&
					messageSurface.querySelector(
						`[data-chat-message-id="${messageId}"]`,
					)
				) {
					reloadNotes();
				}
			} catch {
				// A later reconnect or tab visit will retry the check.
			} finally {
				isChecking = false;
			}
		}

		return { handleReset, checkForMissedReset };
	}

	window.ChatConversationNotesReset = { createNotesResetController };
})();
