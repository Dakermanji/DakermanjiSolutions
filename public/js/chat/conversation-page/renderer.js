//! public/js/chat/conversation-page/renderer.js

(() => {
	const { getMessageList, rebuildMessageDateSeparators } =
		window.ChatConversationRendererList;
	const { createMessageRow, updateMessageRow } =
		window.ChatConversationRendererRows;

	function appendMessage(messageSurface, message, currentUserId, options = {}) {
		if (messageSurface.querySelector(`[data-chat-message-id="${message.id}"]`)) {
			return false;
		}

		const list = getMessageList(messageSurface);
		list.appendChild(createMessageRow(message, currentUserId, options));
		rebuildMessageDateSeparators(messageSurface);
		return true;
	}

	function prependMessages(messageSurface, messages, currentUserId, options = {}) {
		if (messages.length === 0) return;

		const list = getMessageList(messageSurface);
		const previousScrollHeight = messageSurface.scrollHeight;

		for (const message of [...messages].reverse()) {
			if (
				!message?.id ||
				messageSurface.querySelector(`[data-chat-message-id="${message.id}"]`)
			) {
				continue;
			}

			list.prepend(createMessageRow(message, currentUserId, options));
		}

		rebuildMessageDateSeparators(messageSurface);

		const nextScrollHeight = messageSurface.scrollHeight;
		messageSurface.scrollTop += nextScrollHeight - previousScrollHeight;
	}

	function updateMessage(messageSurface, message, options = {}) {
		if (!message?.id) return false;

		const row = messageSurface.querySelector(
			`[data-chat-message-id="${message.id}"]`,
		);
		if (!row) return false;

		return updateMessageRow(row, message, options);
	}

	function removeMessage(messageSurface, messageId) {
		const row = messageSurface.querySelector(
			`[data-chat-message-id="${messageId}"]`,
		);
		if (!row) return false;

		const list = row.closest('[data-chat-message-list]');
		row.remove();

		if (list) {
			rebuildMessageDateSeparators(messageSurface);
		}

		return true;
	}

	window.ChatConversationRenderer = {
		appendMessage,
		prependMessages,
		removeMessage,
		rebuildMessageDateSeparators,
		updateMessage,
	};
})();
