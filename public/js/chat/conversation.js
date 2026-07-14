//! public/js/chat/conversation.js

const chatPage = document.querySelector('[data-active-conversation-id]');
const composer = document.querySelector('[data-chat-composer]');
const messageSurface = document.querySelector('[data-chat-message-surface]');
const typingIndicator = document.querySelector('[data-chat-typing-indicator]');

let typingStopTimer = null;
let typingHideTimer = null;
let isTyping = false;
let isLoadingOlderMessages = false;
let hasOlderMessages = chatPage?.dataset.hasOlderMessages === 'true';

if (chatPage && composer && messageSurface) {
	requestAnimationFrame(() => {
		scrollToLatestMessage();
		void fillScrollableHistory();
	});

	messageSurface.addEventListener('scroll', () => {
		if (messageSurface.scrollTop > 80) return;

		void loadOlderMessages();
	});

	const socket = connectChatSocket();

	if (socket) {
		socket.emit(
			'chat:conversation:join',
			{
				conversationId: chatPage.dataset.activeConversationId,
			},
		);

		socket.on('chat:message:created', (payload) => {
			appendMessage(payload?.message, socket);
		});
		socket.on('chat:typing:updated', (payload) => {
			showTypingIndicator(payload);
		});

		composer.addEventListener('submit', (event) => {
			event.preventDefault();
			void submitLiveMessage(socket);
		});

		const input = composer.elements.message;
		input?.addEventListener('input', () => {
			handleTypingInput(socket, input);
		});
		input?.addEventListener('blur', () => {
			emitTypingState(socket, false);
		});
	}
}

function connectChatSocket() {
	if (typeof window.io !== 'function') return null;

	return window.io({
		withCredentials: true,
	});
}

async function submitLiveMessage(socket) {
	const input = composer.elements.message;
	const message = String(input?.value || '').trim();

	if (!message) return;

	emitTypingState(socket, false);
	setComposerDisabled(true);

	try {
		const response = await emitWithAck(socket, 'chat:message:create', {
			conversationId: chatPage.dataset.activeConversationId,
			message,
		});

		if (!response?.ok) {
			composer.submit();
			return;
		}

		appendMessage(response.message, socket);
		input.value = '';
		input.focus();
	} catch (error) {
		console.error('Failed to send live chat message', error);
		composer.submit();
	} finally {
		setComposerDisabled(false);
	}
}

function emitWithAck(socket, eventName, payload) {
	return new Promise((resolve, reject) => {
		socket.timeout(5000).emit(eventName, payload, (error, response) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(response);
		});
	});
}

function appendMessage(message, socket = null) {
	if (!message?.id || message.conversationId !== chatPage.dataset.activeConversationId) {
		return;
	}

	if (messageSurface.querySelector(`[data-chat-message-id="${message.id}"]`)) {
		return;
	}

	const list = getMessageList();
	list.appendChild(createMessageRow(message));
	hideTypingIndicator();
	scrollToLatestMessage();

	if (socket && message.sender?.id !== chatPage.dataset.currentUserId) {
		socket.emit('chat:conversation:read', {
			conversationId: chatPage.dataset.activeConversationId,
		});
	}
}

function scrollToLatestMessage() {
	messageSurface.scrollTop = messageSurface.scrollHeight;
}

async function loadOlderMessages() {
	if (isLoadingOlderMessages || !hasOlderMessages) return;

	const oldestMessage = messageSurface.querySelector('[data-chat-message-id]');
	if (!oldestMessage) {
		hasOlderMessages = false;
		return;
	}

	const params = new URLSearchParams({
		beforeId: oldestMessage.dataset.chatMessageId,
	});

	isLoadingOlderMessages = true;
	messageSurface.classList.add('is-loading-older');

	try {
		const response = await fetch(
			`${chatPage.dataset.olderMessagesUrl}?${params.toString()}`,
			{
				headers: {
					Accept: 'application/json',
				},
				credentials: 'same-origin',
			},
		);

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();

		if (!payload?.ok || !Array.isArray(payload.messages)) {
			throw new Error('Invalid older messages payload');
		}

		prependMessages(payload.messages);
		hasOlderMessages = Boolean(payload.hasMore);
		chatPage.dataset.hasOlderMessages = hasOlderMessages ? 'true' : 'false';
	} catch (error) {
		console.error('Failed to load older chat messages', error);
	} finally {
		isLoadingOlderMessages = false;
		messageSurface.classList.remove('is-loading-older');
	}
}

async function fillScrollableHistory() {
	while (
		hasOlderMessages &&
		!isLoadingOlderMessages &&
		messageSurface.scrollHeight <= messageSurface.clientHeight
	) {
		await loadOlderMessages();
	}
}

function prependMessages(messages) {
	if (messages.length === 0) return;

	const list = getMessageList();
	const previousScrollHeight = messageSurface.scrollHeight;

	for (const message of [...messages].reverse()) {
		if (
			!message?.id ||
			messageSurface.querySelector(`[data-chat-message-id="${message.id}"]`)
		) {
			continue;
		}

		list.prepend(createMessageRow(message));
	}

	const nextScrollHeight = messageSurface.scrollHeight;
	messageSurface.scrollTop += nextScrollHeight - previousScrollHeight;
}

function handleTypingInput(socket, input) {
	const hasText = String(input?.value || '').trim().length > 0;

	emitTypingState(socket, hasText);

	clearTimeout(typingStopTimer);

	if (hasText) {
		typingStopTimer = setTimeout(() => {
			emitTypingState(socket, false);
		}, 1200);
	}
}

function emitTypingState(socket, nextIsTyping) {
	if (isTyping === nextIsTyping) return;

	isTyping = nextIsTyping;
	socket.emit('chat:typing:update', {
		conversationId: chatPage.dataset.activeConversationId,
		isTyping: nextIsTyping,
	});
}

function showTypingIndicator(payload) {
	if (
		!typingIndicator ||
		payload?.conversationId !== chatPage.dataset.activeConversationId ||
		payload?.userId === chatPage.dataset.currentUserId
	) {
		return;
	}

	if (!payload.isTyping) {
		hideTypingIndicator();
		return;
	}

	typingIndicator.querySelector('span').textContent =
		chatPage.dataset.typingLabel || '';
	typingIndicator.hidden = false;

	clearTimeout(typingHideTimer);
	typingHideTimer = setTimeout(hideTypingIndicator, 2500);
}

function hideTypingIndicator() {
	if (!typingIndicator) return;

	typingIndicator.hidden = true;
	clearTimeout(typingHideTimer);
}

function getMessageList() {
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

function createMessageRow(message) {
	const row = document.createElement('li');
	const isMine = message.sender?.id === chatPage.dataset.currentUserId;
	row.className = `chat-message-row ${isMine ? 'is-mine' : 'is-theirs'}`;
	row.dataset.chatMessageId = message.id;
	row.dataset.chatMessageCreatedAt = new Date(message.createdAt).toISOString();

	const bubble = document.createElement('article');
	bubble.className = 'chat-message-bubble';

	const body = document.createElement('p');
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

function formatMessageTime(value) {
	if (!value) return '';

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
		hour: '2-digit',
		minute: '2-digit',
	}).format(date);
}

function setComposerDisabled(disabled) {
	composer
		.querySelectorAll('input, button')
		.forEach((element) => {
			element.disabled = disabled;
		});
}
