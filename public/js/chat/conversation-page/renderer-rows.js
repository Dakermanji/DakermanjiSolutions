//! public/js/chat/conversation-page/renderer-rows.js

(() => {
	const { formatMessageTime } = window.ChatConversationDates;
	const { createFlagForm, createMessageActions } =
		window.ChatConversationRendererActions;

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
		replyDeletedLabel = '',
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
		setMessageRowDataset(row, message, senderName);

		if (shouldShowSenderDisplay) {
			row.appendChild(createSenderAvatar(message, senderName));
		}

		const bubble = createMessageBubble(message, {
			replyDeletedLabel,
			senderName,
			shouldShowSenderDisplay,
		});
		const meta = createMessageMeta(message, editedLabel);

		row.append(bubble, meta);

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

	function setMessageRowDataset(row, message, senderName) {
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
	}

	function createMessageBubble(message, {
		replyDeletedLabel = '',
		senderName = '',
		shouldShowSenderDisplay = false,
	} = {}) {
		const bubble = document.createElement('article');
		bubble.className = 'chat-message-bubble';

		if (shouldShowSenderDisplay) {
			const senderHeader = document.createElement('header');
			senderHeader.className = 'chat-message-sender-name';
			senderHeader.textContent = senderName;
			bubble.appendChild(senderHeader);
		}

		if (message.replyTo) {
			bubble.appendChild(createReplyQuote(message.replyTo, {
				replyDeletedLabel,
			}));
		}

		const body = document.createElement('p');
		body.className = 'chat-message-text';
		body.dir = 'auto';
		body.textContent = message.body || '';
		bubble.appendChild(body);

		return bubble;
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

	function createReplyQuote(reply, { replyDeletedLabel = '' } = {}) {
		const quote = document.createElement('blockquote');
		quote.className = 'chat-message-reply';
		quote.dir = 'auto';
		quote.dataset.chatMessageReplyId = reply.id || '';

		const sender = document.createElement('strong');
		sender.textContent = getReplySenderName(reply);

		const preview = document.createElement('span');
		preview.textContent = reply.isDeleted
			? replyDeletedLabel
			: reply.bodyPreview || '';

		quote.append(sender, preview);
		return quote;
	}

	function getReplySenderName(reply) {
		return (
			reply.sender?.displayName ||
			reply.sender?.username ||
			reply.sender?.email ||
			''
		);
	}

	function createMessageMeta(message, editedLabel = '') {
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
		return meta;
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

	function updateMessageRow(row, message, options = {}) {
		const body = row.querySelector('.chat-message-text');
		if (body) {
			body.textContent = message.body || '';
		}

		const existingReply = row.querySelector('.chat-message-reply');
		if (message.replyTo) {
			const nextReply = createReplyQuote(message.replyTo, {
				replyDeletedLabel: options.replyDeletedLabel || '',
			});
			if (existingReply) {
				existingReply.replaceWith(nextReply);
			} else {
				body?.before(nextReply);
			}
		} else {
			existingReply?.remove();
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

	window.ChatConversationRendererRows = {
		createMessageRow,
		updateMessageRow,
	};
})();
