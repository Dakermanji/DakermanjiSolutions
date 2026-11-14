//! public/js/chat/conversation-page/notesReset.js

(() => {
	function createNotesResetController({ chatPage, composer, messageSurface, resetForm, reload }) {
		if (chatPage?.dataset.chatConversationKind !== 'self') return null;

		const draftKey = `chat:notes:draft:${chatPage.dataset.currentUserId}:${chatPage.dataset.activeConversationId}`;
		let isSubmittingReset = false;
		let hasConnected = false;
		let isChecking = false;
		let isReloading = false;

		resetForm?.addEventListener('submit', () => {
			isSubmittingReset = true;
		});

		function reloadNotes() {
			if (isSubmittingReset || isReloading) return;
			isReloading = true;
			saveDraft();
			reload();
		}

		function saveDraft() {
			const editor = composer?.querySelector('[data-chat-message-editor]');
			if (!editor) return;
			const draft = String(editor.textContent || '').replace(/\u00a0/g, ' ');
			try {
				if (draft) window.sessionStorage.setItem(draftKey, draft);
				else window.sessionStorage.removeItem(draftKey);
			} catch {
				// The reset can still refresh the page when browser storage is unavailable.
			}
		}

		function restoreDraft() {
			const editor = composer?.querySelector('[data-chat-message-editor]');
			if (!editor || editor.getAttribute('aria-disabled') === 'true') return;
			try {
				const draft = window.sessionStorage.getItem(draftKey);
				if (!draft) return;
				window.sessionStorage.removeItem(draftKey);
				if (editor.textContent) return;
				editor.textContent = draft;
				const valueField = composer.querySelector('[data-chat-message-value]');
				if (valueField) valueField.value = draft;
			} catch {
				// Storage access is optional; the composer remains usable.
			}
		}

		function handleReset(payload) {
			if (
				payload?.conversationId !== chatPage.dataset.activeConversationId
			) {
				return;
			}

			reloadNotes();
		}

		function handleConnect() {
			if (hasConnected) {
				reloadNotes();
				return;
			}
			hasConnected = true;
			void checkForMissedReset();
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

		return { handleConnect, handleReset, checkForMissedReset, restoreDraft };
	}

	window.ChatConversationNotesReset = { createNotesResetController };
})();
