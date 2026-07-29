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

	function createMessageRow(message, currentUserId, {
		canFlagMessages = false,
		flagLabel = '',
		flaggedLabel = '',
		flagUrl = '',
		showSenderDisplay = false,
	} = {}) {
		const row = document.createElement('li');
		const isMine = message.sender?.id === currentUserId;
		const senderName = getSenderName(message);
		const shouldShowSenderDisplay = showSenderDisplay && !isMine;
		const canFlagMessage = canFlagMessages && !isMine && flagUrl;
		row.className = `chat-message-row ${isMine ? 'is-mine' : 'is-theirs'}`;
		row.dataset.chatMessageId = message.id;
		row.dataset.chatMessageSenderId = message.sender?.id || '';
		row.dataset.chatMessageSenderName = senderName;
		row.dataset.chatMessageSenderAvatar = message.sender?.avatar?.src || '';
		row.dataset.chatMessageSenderAvatarBg =
			message.sender?.avatar?.background || '';
		row.dataset.chatMessageCreatedAt = new Date(message.createdAt).toISOString();
		row.dataset.chatMessagePendingFlagCount = String(
			message.pendingFlagCount || 0,
		);
		row.dataset.chatMessageFlaggedByViewer = message.flaggedByViewer
			? 'true'
			: 'false';

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

		const time = document.createElement('time');
		time.className = 'chat-message-time';
		time.dateTime = new Date(message.createdAt).toISOString();
		time.textContent = formatMessageTime(message.createdAt);

		bubble.appendChild(body);
		row.appendChild(bubble);
		row.appendChild(time);

		if (canFlagMessage) {
			row.appendChild(createFlagForm(message, flagUrl, {
				flagLabel,
				flaggedLabel,
			}));
		}

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

	function createFlagForm(message, flagUrl, { flagLabel = '', flaggedLabel = '' } = {}) {
		const isFlagged = Boolean(message.flaggedByViewer);
		const label = isFlagged ? flaggedLabel : flagLabel;
		const form = document.createElement('form');
		form.className = 'chat-message-flag-form';
		form.method = 'POST';
		form.action = flagUrl;

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'messageId';
		input.value = message.id || '';

		const button = document.createElement('button');
		button.className = `btn btn-action-outline chat-message-flag-button has-tooltip${isFlagged ? ' is-flagged' : ''}`;
		button.type = 'submit';
		button.dataset.bsTitle = label;
		button.setAttribute('aria-label', label);
		button.disabled = isFlagged;

		const icon = document.createElement('i');
		icon.className = `bi ${isFlagged ? 'bi-flag-fill' : 'bi-flag'}`;
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		form.append(input, button);
		window.AppTooltips?.initIn(form);
		return form;
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
