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
		setMessageTextContent,
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
		pendingApprovalLabel = '',
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
		const canFlagMessage =
			canFlagMessages && !isMine && !message.isPendingReview && flagUrl;
		const canEditMessage = isMine && message.canEdit && editUrl;
		const canDeleteMessage = isMine && message.canDelete && deleteUrl;

		row.className = [
			'chat-message-row',
			isMine ? 'is-mine' : 'is-theirs',
			message.isPendingReview ? 'is-pending-review' : '',
		].filter(Boolean).join(' ');
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
				pendingApprovalLabel,
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
		row.dataset.chatMessageModerationStatus =
			message.moderationStatus || 'visible';
		row.dataset.chatMessagePendingReview = message.isPendingReview
			? 'true'
			: 'false';
	}

	function updateMessageRow(row, message, options = {}) {
		const body = row.querySelector('.chat-message-text');
		if (body) {
			setMessageTextContent(body, message);
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

		row.classList.toggle('is-pending-review', Boolean(message.isPendingReview));
		updatePendingReviewMarker(row, message, options);
		row.dataset.chatMessageEdited = message.editedAt ? 'true' : 'false';
		row.dataset.chatMessageCanEdit = message.canEdit ? 'true' : 'false';
		row.dataset.chatMessageCanDelete = message.canDelete ? 'true' : 'false';
		row.dataset.chatMessageModerationStatus =
			message.moderationStatus || 'visible';
		row.dataset.chatMessagePendingReview = message.isPendingReview
			? 'true'
			: 'false';

		const meta = row.querySelector('.chat-message-meta');
		meta?.querySelector('.chat-message-edited')?.remove();

		if (meta && message.editedAt && options.editedLabel) {
			meta.prepend(createEditedTime(message.editedAt, options.editedLabel));
		}

		return true;
	}

	function updatePendingReviewMarker(row, message, options = {}) {
		const marker = row.querySelector('[data-chat-message-moderation-marker]');
		const bubble = row.querySelector('.chat-message-bubble');

		if (!message.isPendingReview) {
			marker?.remove();
			return;
		}

		if (marker) return;
		if (!bubble || !options.pendingApprovalLabel) return;

		bubble.appendChild(createPendingReviewMarker(
			options.pendingApprovalLabel,
		));
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
