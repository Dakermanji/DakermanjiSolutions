//! public/js/chat/conversation-page/renderer-rows.js

(() => {
	const { formatMessageTime } = window.ChatConversationDates;
	const { createFlagForm, createMessageActions, createReplyButton } =
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
		replyLabel = '',
		replyDeletedLabel = '',
		reactionUrl = '',
		extraReactions = [],
		quickReactions = [],
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

		if (!isMine) {
			row.appendChild(createSenderStack(message, {
				replyLabel,
				senderName,
				showAvatar: shouldShowSenderDisplay,
			}));
		}

		const bubble = createMessageBubble(message, {
			replyDeletedLabel,
			senderName,
			shouldShowSenderDisplay,
		});
		const meta = createMessageMeta(message, {
			editedLabel,
			extraReactions,
			isMine,
			reactionUrl,
			quickReactions,
			replyLabel,
		});

		row.append(bubble, meta);

		if (canEditMessage || canDeleteMessage) {
			row.appendChild(createMessageActions(
				{
					...message,
					canEdit: canEditMessage,
					canDelete: canDeleteMessage,
				},
				{
					deleteLabel,
					deleteUrl,
					editLabel,
					editUrl,
					replyLabel,
					showReply: false,
				},
			));
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

	function createSenderStack(message, {
		replyLabel = '',
		senderName = '',
		showAvatar = false,
	} = {}) {
		const stack = document.createElement('div');
		stack.className = 'chat-message-sender-stack';

		if (showAvatar) {
			stack.appendChild(createSenderAvatar(message, senderName));
		}

		stack.appendChild(createReplyButton(replyLabel, 'chat-message-reply-side'));
		return stack;
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

	function createReactionPicker(message, {
		extraReactions = [],
		quickReactions = [],
		reactionUrl = '',
	} = {}) {
		if (!reactionUrl || quickReactions.length === 0) {
			return null;
		}

		const picker = document.createElement('span');
		picker.className = 'chat-message-reaction-picker';
		picker.dataset.chatMessageReactions = 'true';

		const toggle = document.createElement('button');
		toggle.className =
			'btn btn-action-outline chat-message-action chat-message-reaction-toggle';
		toggle.type = 'button';
		toggle.dataset.chatMessageReactionToggle = 'true';
		toggle.setAttribute('aria-label', 'React');
		toggle.setAttribute('aria-expanded', 'false');

		const icon = document.createElement('i');
		icon.className = 'bi bi-emoji-smile';
		icon.setAttribute('aria-hidden', 'true');

		const plusIcon = document.createElement('i');
		plusIcon.className = 'bi bi-plus chat-message-reaction-plus';
		plusIcon.setAttribute('aria-hidden', 'true');

		toggle.append(icon, plusIcon);

		const menu = document.createElement('span');
		menu.className = 'chat-message-reaction-menu';
		menu.dataset.chatMessageReactionMenu = 'true';
		menu.hidden = true;
		menu.appendChild(createReactionSearchBox());

		const quickGroup = document.createElement('span');
		quickGroup.className = 'chat-message-reaction-group';
		const reactionsByValue = new Map(
			(message.reactions || []).map((reaction) => [
				reaction.reaction,
				reaction,
			]),
		);

		for (const quickReaction of quickReactions) {
			quickGroup.appendChild(createReactionForm({
				message,
				reaction: quickReaction,
				reactionState: reactionsByValue.get(quickReaction.reaction),
				reactionUrl,
			}));
		}

		if (extraReactions.length > 0) {
			quickGroup.appendChild(createSearchReactionButton());
			quickGroup.appendChild(createMoreReactionButton());
		}

		menu.appendChild(quickGroup);

		if (extraReactions.length > 0) {
			const extraGroup = document.createElement('span');
			extraGroup.className = 'chat-message-reaction-group is-extra';
			extraGroup.dataset.chatMessageReactionExtra = 'true';
			extraGroup.hidden = true;

			for (const extraReaction of extraReactions) {
				extraGroup.appendChild(createReactionForm({
					message,
					reaction: extraReaction,
					reactionState: reactionsByValue.get(extraReaction.reaction),
					reactionUrl,
				}));
			}

			menu.appendChild(extraGroup);
		}

		picker.append(toggle, menu);
		window.AppTooltips?.initIn(picker);
		return picker;
	}

	function createReactionForm({
		message,
		reaction,
		reactionState = {},
		reactionUrl = '',
	}) {
		const count = Number(reactionState?.count || 0);
		const label = reaction.label || reactionState?.label || reaction.reaction;
		const form = document.createElement('form');
		form.className = 'chat-message-reaction-form';
		form.method = 'POST';
		form.action = reactionUrl;
		form.dataset.chatMessageReactionForm = 'true';
		form.dataset.chatMessageReactionSearchText = [
			reaction.reaction,
			reaction.label,
			...(reaction.keywords || []),
		].join(' ');

		const messageInput = document.createElement('input');
		messageInput.type = 'hidden';
		messageInput.name = 'messageId';
		messageInput.value = message.id || '';

		const reactionInput = document.createElement('input');
		reactionInput.type = 'hidden';
		reactionInput.name = 'reaction';
		reactionInput.value = reaction.reaction || '';

		const button = document.createElement('button');
		button.className = `chat-message-reaction has-tooltip has-title${reactionState?.reactedByViewer ? ' is-active' : ''}`;
		button.type = 'submit';
		button.dataset.bsTitle = label;
		button.setAttribute('aria-label', `${label}: ${count}`);

		const emoji = document.createElement('span');
		emoji.setAttribute('aria-hidden', 'true');
		emoji.textContent = reaction.reaction || '';

		button.appendChild(emoji);

		if (count > 0) {
			const countText = document.createElement('span');
			countText.textContent = String(count);
			button.appendChild(countText);
		}

		form.append(messageInput, reactionInput, button);
		return form;
	}

	function createReactionSearchBox() {
		const search = document.createElement('span');
		search.className = 'chat-message-reaction-search';
		search.dataset.chatMessageReactionSearch = 'true';
		search.hidden = true;

		const icon = document.createElement('i');
		icon.className = 'bi bi-search';
		icon.setAttribute('aria-hidden', 'true');

		const input = document.createElement('input');
		input.type = 'search';
		input.dataset.chatMessageReactionSearchInput = 'true';
		input.setAttribute('aria-label', 'Search reactions');
		input.placeholder = 'Search...';

		search.append(icon, input);
		return search;
	}

	function createSearchReactionButton() {
		const button = document.createElement('button');
		button.className = 'chat-message-reaction chat-message-reaction-search-toggle';
		button.type = 'button';
		button.dataset.chatMessageReactionSearchToggle = 'true';
		button.setAttribute('aria-label', 'Search reactions');
		button.setAttribute('aria-expanded', 'false');

		const icon = document.createElement('i');
		icon.className = 'bi bi-search';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		return button;
	}

	function createMoreReactionButton() {
		const button = document.createElement('button');
		button.className = 'chat-message-reaction chat-message-reaction-more';
		button.type = 'button';
		button.dataset.chatMessageReactionMore = 'true';
		button.setAttribute('aria-label', 'More reactions');
		button.setAttribute('aria-expanded', 'false');

		const icon = document.createElement('i');
		icon.className = 'bi bi-plus-lg';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		return button;
	}

	function getReplySenderName(reply) {
		return (
			reply.sender?.displayName ||
			reply.sender?.username ||
			reply.sender?.email ||
			''
		);
	}

	function createMessageMeta(message, {
		editedLabel = '',
		extraReactions = [],
		isMine = false,
		quickReactions = [],
		reactionUrl = '',
		replyLabel = '',
	} = {}) {
		const meta = document.createElement('div');
		meta.className = 'chat-message-meta';
		const timeActions = document.createElement('div');
		timeActions.className = 'chat-message-time-actions';
		const time = document.createElement('time');
		time.className = 'chat-message-time';
		time.dateTime = new Date(message.createdAt).toISOString();
		time.textContent = formatMessageTime(message.createdAt);

		if (message.editedAt && editedLabel) {
			meta.appendChild(createEditedTime(message.editedAt, editedLabel));
		}

		const reactionPicker = createReactionPicker(message, {
			extraReactions,
			quickReactions,
			reactionUrl,
		});

		if (reactionPicker) {
			timeActions.appendChild(reactionPicker);
		}

		timeActions.appendChild(time);
		if (isMine) {
			timeActions.appendChild(
				createReplyButton(replyLabel, 'chat-message-reply-inline'),
			);
		}

		meta.appendChild(timeActions);
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

	function updateMessageReactions(row, reactions, options = {}) {
		const message = {
			id: row.dataset.chatMessageId || '',
			reactions,
		};

		row.querySelector('[data-chat-message-reactions]')?.remove();
		const timeActions = row.querySelector('.chat-message-time-actions');
		const picker = createReactionPicker(message, {
			extraReactions: options.extraReactions || [],
			quickReactions: options.quickReactions || [],
			reactionUrl: options.reactionUrl || '',
		});
		if (timeActions && picker) {
			timeActions.prepend(picker);
		}

		return true;
	}

	window.ChatConversationRendererRows = {
		createMessageRow,
		updateMessageReactions,
		updateMessageRow,
	};
})();
