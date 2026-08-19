//! public/js/chat/conversation-page/renderer-rows.js

(() => {
	const { createFlagForm, createMessageActions } =
		window.ChatConversationRendererActions;
	const { createSenderStack, getSenderName } =
		window.ChatConversationRendererSenders;
	const { appendReactionSummary, createReactionPicker } =
		window.ChatConversationRendererReactions;
	const {
		createEditedTime,
		createMessageContent,
		createMessageMeta,
	} = window.ChatConversationRendererContent;
	const { createReplyQuote } = window.ChatConversationRendererSenders;

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

		row.append(
			createMessageContent(message, {
				replyDeletedLabel,
				senderName,
				shouldShowSenderDisplay,
			}),
			createMessageMeta(message, {
				editedLabel,
				extraReactions,
				isMine,
				reactionUrl,
				quickReactions,
				replyLabel,
			}),
		);

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

		row.querySelector('[data-chat-message-reaction-summary]')?.remove();
		appendReactionSummary(
			row.querySelector('.chat-message-content') || row,
			reactions,
		);
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
