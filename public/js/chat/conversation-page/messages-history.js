//! public/js/chat/conversation-page/messages-history.js

(() => {
	const { escapeCssIdentifier } = window.ChatConversationUtils;

	function createHistoryController({
		chatPage,
		messageRenderer,
		messageSurface,
		getRendererOptions,
		scheduleVisibleMessageMutationExpiries,
	}) {
		let isLoadingOlderMessages = false;
		let hasOlderMessages = chatPage?.dataset.hasOlderMessages === 'true';

		async function loadOlderMessages() {
			if (isLoadingOlderMessages || !hasOlderMessages) return false;

			const oldestMessage = messageSurface.querySelector(
				'[data-chat-message-id]',
			);
			if (!oldestMessage) {
				hasOlderMessages = false;
				return false;
			}

			const params = new URLSearchParams({
				beforeId: oldestMessage.dataset.chatMessageId,
			});

			isLoadingOlderMessages = true;
			messageSurface.classList.add('is-loading-older');

			try {
				const response = await fetch(
					`${chatPage.dataset.olderMessagesUrl}?${params.toString()}`,
					{
						headers: {
							Accept: 'application/json',
						},
						credentials: 'same-origin',
					},
				);

				if (!response.ok) {
					throw new Error(`Request failed with status ${response.status}`);
				}

				const payload = await response.json();

				if (!payload?.ok || !Array.isArray(payload.messages)) {
					throw new Error('Invalid older messages payload');
				}

				messageRenderer.prependMessages(
					messageSurface,
					payload.messages,
					chatPage.dataset.currentUserId,
					getRendererOptions(),
				);
				hasOlderMessages = Boolean(payload.hasMore);
				chatPage.dataset.hasOlderMessages = hasOlderMessages
					? 'true'
					: 'false';
				scheduleVisibleMessageMutationExpiries();
				return true;
			} catch (error) {
				console.error('Failed to load older chat messages', error);
				return false;
			} finally {
				isLoadingOlderMessages = false;
				messageSurface.classList.remove('is-loading-older');
			}
		}

		async function fillScrollableHistory() {
			while (
				hasOlderMessages &&
				!isLoadingOlderMessages &&
				messageSurface.scrollHeight <= messageSurface.clientHeight
			) {
				await loadOlderMessages();
			}
		}

		async function focusMessageById(messageId) {
			if (!messageId) return false;

			let row = findMessageRow(messageId);

			while (!row && hasOlderMessages) {
				const loadedOlderMessages = await loadOlderMessages();
				if (!loadedOlderMessages) break;
				row = findMessageRow(messageId);
			}

			if (!row) {
				showFocusMessageState();
				return false;
			}

			clearFocusMessageState();
			row.scrollIntoView({ block: 'center', behavior: 'smooth' });
			row.classList.add('is-context-focused');
			window.setTimeout(() => {
				row.classList.remove('is-context-focused');
			}, 2200);

			return true;
		}

		function findMessageRow(messageId) {
			return messageSurface.querySelector(
				`[data-chat-message-id="${escapeCssIdentifier(messageId)}"]`,
			);
		}

		function showFocusMessageState() {
			clearFocusMessageState();

			const message = chatPage.dataset.focusMessageMissingLabel || '';
			if (!message) return;

			const notice = document.createElement('div');
			notice.className = 'chat-focus-state';
			notice.dataset.chatFocusState = 'true';
			notice.setAttribute('role', 'status');
			notice.innerHTML = '<i class="bi bi-clock-history" aria-hidden="true"></i>';

			const text = document.createElement('span');
			text.textContent = message;
			notice.appendChild(text);

			messageSurface.prepend(notice);
		}

		function clearFocusMessageState() {
			messageSurface
				.querySelectorAll('[data-chat-focus-state]')
				.forEach((notice) => notice.remove());
		}

		return {
			fillScrollableHistory,
			focusMessageById,
			loadOlderMessages,
		};
	}

	window.ChatConversationMessageHistory = {
		createHistoryController,
	};
})();
