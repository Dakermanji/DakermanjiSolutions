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
		deleteLabel = '',
		deleteUrl = '',
		editLabel = '',
		editUrl = '',
		flagLabel = '',
		flaggedLabel = '',
		flagUrl = '',
		editedLabel = '',
		showSenderDisplay = false,
	} = {}) {
		const row = document.createElement('li');
		const isMine = message.sender?.id === currentUserId;
		const senderName = getSenderName(message);
		const shouldShowSenderDisplay = showSenderDisplay && !isMine;
		const canFlagMessage = canFlagMessages && !isMine && flagUrl;
		const canEditMessage = isMine && message.canEdit && editUrl;
		const canDeleteMessage = isMine && message.canDelete && deleteUrl;
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
		row.dataset.chatMessageCanEdit = message.canEdit ? 'true' : 'false';
		row.dataset.chatMessageCanDelete = message.canDelete ? 'true' : 'false';
		row.dataset.chatMessageEdited = message.editedAt ? 'true' : 'false';

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
		bubble.appendChild(body);

		const meta = document.createElement('span');
		meta.className = 'chat-message-meta';
		const time = document.createElement('time');
		time.className = 'chat-message-time';
		time.dateTime = new Date(message.createdAt).toISOString();
		time.textContent = formatMessageTime(message.createdAt);

		if (message.editedAt && editedLabel) {
			meta.appendChild(createEditedTime(message.editedAt, editedLabel));
		}

		meta.appendChild(time);
		row.appendChild(bubble);
		row.appendChild(meta);

		if (canEditMessage || canDeleteMessage) {
			row.appendChild(createMessageActions(message, {
				deleteLabel,
				deleteUrl,
				editLabel,
				editUrl,
			}));
		}

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

	function createEditedTime(value, editedLabel = '') {
		const edited = document.createElement('span');
		edited.className = 'chat-message-edited';

		const label = document.createElement('span');
		label.textContent = editedLabel;

		const time = document.createElement('time');
		time.dateTime = new Date(value).toISOString();
		time.textContent = formatMessageTime(value);

		edited.append(label, time);
		return edited;
	}

	function createMessageActions(message, {
		deleteLabel = '',
		deleteUrl = '',
		editLabel = '',
		editUrl = '',
	} = {}) {
		const actions = document.createElement('div');
		actions.className = 'chat-message-actions';

		if (message.canEdit && editUrl) {
			actions.appendChild(createEditButton(editLabel));
		}

		if (message.canDelete && deleteUrl) {
			actions.appendChild(createDeleteForm(message, deleteUrl, deleteLabel));
		}

		window.AppTooltips?.initIn(actions);
		return actions;
	}

	function createEditButton(editLabel = '') {
		const button = document.createElement('button');
		button.className = 'btn btn-action-outline chat-message-action has-tooltip';
		button.type = 'button';
		button.dataset.chatMessageEdit = 'true';
		button.dataset.bsTitle = editLabel;
		button.setAttribute('aria-label', editLabel);

		const icon = document.createElement('i');
		icon.className = 'bi bi-pencil';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		return button;
	}

	function createDeleteForm(message, deleteUrl, deleteLabel = '') {
		const form = document.createElement('form');
		form.className = 'chat-message-delete-form';
		form.method = 'POST';
		form.action = deleteUrl;
		form.dataset.chatMessageDeleteForm = 'true';

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'messageId';
		input.value = message.id || '';

		const button = document.createElement('button');
		button.className = 'btn btn-action-outline chat-message-action is-danger has-tooltip';
		button.type = 'submit';
		button.dataset.bsTitle = deleteLabel;
		button.setAttribute('aria-label', deleteLabel);

		const icon = document.createElement('i');
		icon.className = 'bi bi-trash3';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		form.append(input, button);
		return form;
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

	function updateMessage(messageSurface, message, options = {}) {
		if (!message?.id) return false;

		const row = messageSurface.querySelector(
			`[data-chat-message-id="${message.id}"]`,
		);
		if (!row) return false;

		const body = row.querySelector('.chat-message-text');
		if (body) {
			body.textContent = message.body || '';
		}

		row.dataset.chatMessageEdited = message.editedAt ? 'true' : 'false';
		row.dataset.chatMessageCanEdit = message.canEdit ? 'true' : 'false';
		row.dataset.chatMessageCanDelete = message.canDelete ? 'true' : 'false';

		const meta = row.querySelector('.chat-message-meta');
		meta?.querySelector('.chat-message-edited')?.remove();

		if (meta && message.editedAt && options.editedLabel) {
			meta.prepend(createEditedTime(message.editedAt, options.editedLabel));
		}

		return true;
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
