//! public/js/chat/conversation-page/messages-flags.js

(() => {
	const {
		setFormControlsDisabled,
		showFlashMessage,
	} = window.ChatConversationUtils;

	function createFlagController({ chatPage }) {
		async function submitMessageFlag(form) {
			const row = form.closest('[data-chat-message-id]');
			const button = form.querySelector('button[type="submit"]');
			const icon = button?.querySelector('i');
			const messageId = form.elements.messageId?.value || row?.dataset.chatMessageId;
			if (!row || !button || !messageId || button.disabled) return;

			const fields = new URLSearchParams(new FormData(form));
			setFormControlsDisabled(form, true);

			try {
				const response = await fetch(form.action, {
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: fields.toString(),
					credentials: 'same-origin',
				});
				const payload = await response.json();

				if (!response.ok || !payload?.ok) {
					throw new Error(`Request failed with status ${response.status}`);
				}

				row.dataset.chatMessageFlaggedByViewer = 'true';
				button.classList.add('is-flagged');
				button.dataset.bsTitle = chatPage.dataset.messageFlaggedLabel || '';
				button.setAttribute(
					'aria-label',
					chatPage.dataset.messageFlaggedLabel || '',
				);
				button.disabled = true;

				if (icon) {
					icon.className = 'bi bi-flag-fill';
				}

				window.AppTooltips?.initIn(form);
			} catch (error) {
				console.error('Failed to flag chat message', error);
				showFlashMessage(chatPage.dataset.flagMessageErrorLabel || '');
				setFormControlsDisabled(form, false);
			}
		}

		return {
			submitMessageFlag,
		};
	}

	window.ChatConversationMessageFlags = {
		createFlagController,
	};
})();
