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

	function createMessageRow(message, currentUserId, { showSenderDisplay = false } = {}) {
		const row = document.createElement('li');
		const isMine = message.sender?.id === currentUserId;
		const senderName = getSenderName(message);
		const shouldShowSenderDisplay = showSenderDisplay && !isMine;
		row.className = `chat-message-row ${isMine ? 'is-mine' : 'is-theirs'}`;
		row.dataset.chatMessageId = message.id;
		row.dataset.chatMessageSenderId = message.sender?.id || '';
		row.dataset.chatMessageSenderName = senderName;
		row.dataset.chatMessageSenderAvatar = message.sender?.avatar?.src || '';
		row.dataset.chatMessageSenderAvatarBg =
			message.sender?.avatar?.background || '';
		row.dataset.chatMessageCreatedAt = new Date(message.createdAt).toISOString();

		if (shouldShowSenderDisplay) {
			row.appendChild(createSenderAvatar(message, senderName));
		}

		const bubble = document.createElement('article');
		bubble.className = 'chat-message-bubble';

		if (shouldShowSenderDisplay) {
			const senderHeader = document.createElement('header');
			senderHeader.className = 'chat-message-sender-name';
			senderHeader.textContent = senderName;
			bubble.appendChild(senderHeader);
		}

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

	function getSenderName(message) {
		return (
			message.sender?.displayName ||
			message.sender?.username ||
			message.sender?.email ||
			''
		);
	}

	function createSenderAvatar(message, senderName) {
		const avatar = document.createElement('span');
		avatar.className = 'chat-message-sender-avatar';
		avatar.style.backgroundColor = message.sender?.avatar?.background || '';
		avatar.setAttribute('aria-hidden', 'true');

		if (message.sender?.avatar?.src) {
			const image = document.createElement('img');
			image.src = message.sender.avatar.src;
			image.alt = '';
			avatar.appendChild(image);
		} else {
			avatar.textContent = senderName.slice(0, 1).toUpperCase();
		}

		return avatar;
	}

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

	window.ChatConversationRenderer = {
		appendMessage,
		prependMessages,
		rebuildMessageDateSeparators,
	};
})();
