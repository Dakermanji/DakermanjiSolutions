//! public/js/chat/conversation-page/read-state.js

(() => {
	const { emitWithAck } = window.ChatConversationUtils;
	const READ_RETRY_DELAY_MS = 1500;

	function createReadStateController({
		chatPage,
		messageSurface,
		getChatSocket,
	}) {
		let acknowledgedMessageId = '';
		let animationFrameId = null;
		let retryTimerId = null;
		let isSyncing = false;
		let shouldSyncAgain = false;

		function scheduleSync() {
			shouldSyncAgain = true;
			if (animationFrameId !== null) return;

			animationFrameId = window.requestAnimationFrame(() => {
				animationFrameId = null;
				void syncNewestVisibleMessage();
			});
		}

		async function syncNewestVisibleMessage() {
			if (isSyncing || !shouldSyncAgain) return;

			shouldSyncAgain = false;
			const socket = getChatSocket();
			const messageId = getNewestVisibleMessageId();

			if (!socket?.connected || !messageId || messageId === acknowledgedMessageId) {
				return;
			}

			isSyncing = true;
			clearTimeout(retryTimerId);

			try {
				const response = await emitWithAck(socket, 'chat:conversation:read', {
					conversationId: chatPage.dataset.activeConversationId,
					messageId,
				});

				if (!response?.ok) {
					scheduleRetry();
					return;
				}

				acknowledgedMessageId = messageId;
			} catch {
				scheduleRetry();
			} finally {
				isSyncing = false;
				if (shouldSyncAgain) scheduleSync();
			}
		}

		function getNewestVisibleMessageId() {
			if (
				document.visibilityState !== 'visible' ||
				messageSurface.hidden ||
				messageSurface.getClientRects().length === 0
			) {
				return '';
			}

			const surfaceBounds = messageSurface.getBoundingClientRect();
			const rows = messageSurface.querySelectorAll('[data-chat-message-id]');
			let newestVisibleMessageId = '';

			for (const row of rows) {
				const rowBounds = row.getBoundingClientRect();
				if (
					rowBounds.bottom > surfaceBounds.top &&
					rowBounds.top < surfaceBounds.bottom
				) {
					newestVisibleMessageId = row.dataset.chatMessageId || '';
				}
			}

			return newestVisibleMessageId;
		}

		function scheduleRetry() {
			clearTimeout(retryTimerId);
			retryTimerId = window.setTimeout(scheduleSync, READ_RETRY_DELAY_MS);
		}

		function handleVisibilityChange() {
			if (document.visibilityState === 'visible') scheduleSync();
		}

		window.addEventListener('focus', scheduleSync);
		window.addEventListener('resize', scheduleSync);
		document.addEventListener('visibilitychange', handleVisibilityChange);
		new MutationObserver(() => {
			if (!messageSurface.hidden) scheduleSync();
		}).observe(messageSurface, {
			attributes: true,
			attributeFilter: ['hidden'],
		});

		return {
			scheduleSync,
		};
	}

	window.ChatConversationReadState = {
		createReadStateController,
	};
})();
