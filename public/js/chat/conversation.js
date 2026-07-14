//! public/js/chat/conversation.js

const chatPage = document.querySelector('[data-active-conversation-id]');
const composer = document.querySelector('[data-chat-composer]');
const messageSurface = document.querySelector('[data-chat-message-surface]');

if (chatPage && composer && messageSurface) {
	const socket = connectChatSocket();

	if (socket) {
		socket.emit(
			'chat:conversation:join',
			{
				conversationId: chatPage.dataset.activeConversationId,
			},
		);

		socket.on('chat:message:created', (payload) => {
			appendMessage(payload?.message);
		});

		composer.addEventListener('submit', (event) => {
			event.preventDefault();
			void submitLiveMessage(socket);
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

		appendMessage(response.message);
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

function appendMessage(message) {
	if (!message?.id || message.conversationId !== chatPage.dataset.activeConversationId) {
		return;
	}

	if (messageSurface.querySelector(`[data-chat-message-id="${message.id}"]`)) {
		return;
	}

	const list = getMessageList();
	list.appendChild(createMessageRow(message));
	messageSurface.scrollTop = messageSurface.scrollHeight;
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
