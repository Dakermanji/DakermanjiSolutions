//! public/js/chat/conversation-page/renderer-senders.js

(() => {
	const { createReplyButton } = window.ChatConversationRendererActions;

	function getSenderName(message) {
		return (
			message.sender?.displayName ||
			message.sender?.username ||
			message.sender?.email ||
			''
		);
	}

	function getReplySenderName(reply) {
		return (
			reply.sender?.displayName ||
			reply.sender?.username ||
			reply.sender?.email ||
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

	window.ChatConversationRendererSenders = {
		createReplyQuote,
		createSenderStack,
		getSenderName,
	};
})();
