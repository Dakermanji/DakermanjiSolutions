//! public/js/chat/conversation-page/renderer-content.js

(() => {
	const { formatMessageTime } = window.ChatConversationDates;
	const { createReplyButton } = window.ChatConversationRendererActions;
	const { createReplyQuote } = window.ChatConversationRendererSenders;
	const { appendReactionSummary, createReactionPicker } =
		window.ChatConversationRendererReactions;

	function getMentionUsernames(message) {
		return new Set(
			(message.mentions || [])
				.map((mention) => String(mention.username || '').toLowerCase())
				.filter(Boolean),
		);
	}

	function setMessageTextContent(element, message) {
		const text = String(message.body || '');
		const mentionUsernames = getMentionUsernames(message);
		const mentionPattern = /(^|[^a-zA-Z0-9_.-])@([a-zA-Z0-9_.-]{3,20})(?=$|[^a-zA-Z0-9_.-])/g;
		let cursor = 0;
		let match;

		element.textContent = '';

		while ((match = mentionPattern.exec(text))) {
			const prefix = match[1] || '';
			const username = match[2] || '';
			const mentionStart = match.index + prefix.length;
			const mentionText = `@${username}`;

			if (mentionStart > cursor) {
				element.appendChild(document.createTextNode(
					text.slice(cursor, mentionStart),
				));
			}

			if (mentionUsernames.has(username.toLowerCase())) {
				const mention = document.createElement('span');
				mention.className = 'chat-message-mention';
				mention.textContent = mentionText;
				element.appendChild(mention);
			} else {
				element.appendChild(document.createTextNode(mentionText));
			}

			cursor = mentionStart + mentionText.length;
		}

		if (cursor < text.length) {
			element.appendChild(document.createTextNode(text.slice(cursor)));
		}
	}

	function createMessageContent(message, options = {}) {
		const content = document.createElement('div');
		content.className = 'chat-message-content';

		content.appendChild(createMessageBubble(message, options));
		appendReactionSummary(content, message.reactions || []);

		return content;
	}

	function createMessageBubble(message, {
		pendingApprovalLabel = '',
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
		setMessageTextContent(body, message);
		bubble.appendChild(body);

		if (message.isPendingReview && pendingApprovalLabel) {
			bubble.appendChild(createPendingReviewMarker(pendingApprovalLabel));
		}

		return bubble;
	}

	function createPendingReviewMarker(labelText) {
		const marker = document.createElement('span');
		marker.className = 'chat-message-moderation-marker';
		marker.dataset.chatMessageModerationMarker = '';

		const icon = document.createElement('i');
		icon.className = 'bi bi-hourglass-split';
		icon.setAttribute('aria-hidden', 'true');

		const label = document.createElement('span');
		label.textContent = labelText;

		marker.append(icon, label);
		return marker;
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

		const reactionPicker = message.isPendingReview
			? null
			: createReactionPicker(message, {
				extraReactions,
				quickReactions,
				reactionUrl,
			});

		if (reactionPicker) {
			timeActions.appendChild(reactionPicker);
		}

		timeActions.appendChild(time);
		if (isMine && !message.isPendingReview) {
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

	window.ChatConversationRendererContent = {
		createEditedTime,
		createMessageContent,
		createMessageMeta,
		setMessageTextContent,
	};
})();
