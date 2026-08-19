//! public/js/chat/conversation-page/renderer-content.js

(() => {
	const { formatMessageTime } = window.ChatConversationDates;
	const { createReplyButton } = window.ChatConversationRendererActions;
	const { createReplyQuote } = window.ChatConversationRendererSenders;
	const { appendReactionSummary, createReactionPicker } =
		window.ChatConversationRendererReactions;

	function createMessageContent(message, options = {}) {
		const content = document.createElement('div');
		content.className = 'chat-message-content';

		content.appendChild(createMessageBubble(message, options));
		appendReactionSummary(content, message.reactions || []);

		return content;
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

	window.ChatConversationRendererContent = {
		createEditedTime,
		createMessageContent,
		createMessageMeta,
	};
})();
