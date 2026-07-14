//! public/js/chat/conversation-page/renderer.js

(() => {
	const { formatMessageDate, formatMessageTime, getMessageDateKey } =
		window.ChatConversationDates;

	function getMessageList(messageSurface) {
		const existingList = messageSurface.querySelector('[data-chat-message-list]');

		if (existingList) {
			return existingList;
		}

		messageSurface.querySelector('[data-chat-empty-state]')?.remove();

		const list = document.createElement('ol');
		list.className = 'chat-message-list';
		list.dataset.chatMessageList = 'true';
		messageSurface.appendChild(list);
		return list;
	}

	function createDateSeparatorRow(dateKey, value) {
		const row = document.createElement('li');
		row.className = 'chat-date-separator';
		row.dataset.chatDateSeparator = 'true';

		const time = document.createElement('time');
		time.dateTime = dateKey;
		time.textContent = `-- ${formatMessageDate(value)} --`;

		row.appendChild(time);
		return row;
	}

	function isSameMessageGroup(currentRow, nextRow) {
		if (!currentRow || !nextRow) return false;

		return (
			currentRow.dataset.chatMessageSenderId ===
				nextRow.dataset.chatMessageSenderId &&
			getMessageDateKey(currentRow.dataset.chatMessageCreatedAt) ===
				getMessageDateKey(nextRow.dataset.chatMessageCreatedAt)
		);
	}

	function rebuildMessageGroups(list) {
		const rows = [...list.querySelectorAll('[data-chat-message-id]')];

		for (const row of rows) {
			row.classList.remove('is-group-start', 'is-group-middle', 'is-group-end');
			row.dataset.chatGroupStart = 'false';
			row.dataset.chatGroupEnd = 'false';
		}

		for (const [index, row] of rows.entries()) {
			const previousRow = rows[index - 1] || null;
			const nextRow = rows[index + 1] || null;
			const isGroupStart = !isSameMessageGroup(previousRow, row);
			const isGroupEnd = !isSameMessageGroup(row, nextRow);

			row.classList.add(
				isGroupStart
					? 'is-group-start'
					: 'is-group-middle',
			);

			if (isGroupEnd) {
				row.classList.add('is-group-end');
			}

			row.dataset.chatGroupStart = isGroupStart ? 'true' : 'false';
			row.dataset.chatGroupEnd = isGroupEnd ? 'true' : 'false';
		}
	}

	function rebuildMessageDateSeparators(messageSurface) {
		const list = messageSurface.querySelector('[data-chat-message-list]');
		if (!list) return;

		list
			.querySelectorAll('[data-chat-date-separator]')
			.forEach((separator) => separator.remove());

		let currentDateKey = '';

		for (const row of [...list.querySelectorAll('[data-chat-message-id]')]) {
			const dateKey = getMessageDateKey(row.dataset.chatMessageCreatedAt);
			if (!dateKey || dateKey === currentDateKey) continue;

			currentDateKey = dateKey;
			row.before(createDateSeparatorRow(dateKey, row.dataset.chatMessageCreatedAt));
		}

		rebuildMessageGroups(list);
	}

	function createMessageRow(message, currentUserId) {
		const row = document.createElement('li');
		const isMine = message.sender?.id === currentUserId;
		row.className = `chat-message-row ${isMine ? 'is-mine' : 'is-theirs'}`;
		row.dataset.chatMessageId = message.id;
		row.dataset.chatMessageSenderId = message.sender?.id || '';
		row.dataset.chatMessageCreatedAt = new Date(message.createdAt).toISOString();

		const bubble = document.createElement('article');
		bubble.className = 'chat-message-bubble';

		const body = document.createElement('p');
		body.className = 'chat-message-text';
		body.dir = 'auto';
		body.textContent = message.body || '';

		const footer = document.createElement('footer');
		const time = document.createElement('time');
		time.dateTime = new Date(message.createdAt).toISOString();
		time.textContent = formatMessageTime(message.createdAt);

		footer.appendChild(time);
		bubble.append(body, footer);
		row.appendChild(bubble);

		return row;
	}

	function appendMessage(messageSurface, message, currentUserId) {
		if (messageSurface.querySelector(`[data-chat-message-id="${message.id}"]`)) {
			return false;
		}

		const list = getMessageList(messageSurface);
		list.appendChild(createMessageRow(message, currentUserId));
		rebuildMessageDateSeparators(messageSurface);
		return true;
	}

	function prependMessages(messageSurface, messages, currentUserId) {
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

			list.prepend(createMessageRow(message, currentUserId));
		}

		rebuildMessageDateSeparators(messageSurface);

		const nextScrollHeight = messageSurface.scrollHeight;
		messageSurface.scrollTop += nextScrollHeight - previousScrollHeight;
	}

	window.ChatConversationRenderer = {
		appendMessage,
		prependMessages,
		rebuildMessageDateSeparators,
	};
})();
