//! public/js/chat/conversation.js

const chatPage = document.querySelector('[data-active-conversation-id]');
const composer = document.querySelector('[data-chat-composer]');
const composerNotice = document.querySelector('[data-chat-composer-notice]');
const managementPanel = document.querySelector('[data-chat-management-panel]');
const managementToggle = document.querySelector('[data-chat-management-toggle]');
const messageSurface = document.querySelector('[data-chat-message-surface]');
const membersPanel = document.querySelector('[data-chat-members-panel]');
const membersToggle = document.querySelector('[data-chat-members-toggle]');
const typingIndicator = document.querySelector('[data-chat-typing-indicator]');
const messageRenderer = window.ChatConversationRenderer;

let typingStopTimer = null;
let typingHideTimer = null;
let isTyping = false;
let isLoadingOlderMessages = false;
let hasOlderMessages = chatPage?.dataset.hasOlderMessages === 'true';
let chatSocket = null;
const mutationExpiryTimers = new Map();
const isRoomConversation = chatPage?.dataset.chatConversationKind === 'room';
const messageMutationWindowMs = Number(
	chatPage?.dataset.messageMutationWindowMs || 0,
);

if (chatPage && messageSurface && messageRenderer) {
	requestAnimationFrame(() => {
		messageRenderer.rebuildMessageDateSeparators(messageSurface);
		scrollToLatestMessage();
		if (composer) {
			focusComposerInput();
		}
		void fillScrollableHistory();
		scheduleVisibleMessageMutationExpiries();
	});

	messageSurface.addEventListener('scroll', () => {
		if (messageSurface.scrollTop > 80) return;

		void loadOlderMessages();
	});
	messageSurface.addEventListener('click', handleMessageActionClick);
	messageSurface.addEventListener('submit', handleMessageActionSubmit);

	membersToggle?.addEventListener('click', () => {
		setActiveSidePanel(
			membersPanel?.hidden !== false ? 'members' : null,
		);
	});

	managementToggle?.addEventListener('click', () => {
		setActiveSidePanel(
			managementPanel?.hidden !== false ? 'management' : null,
		);
	});

	const socket = composer ? connectChatSocket() : null;
	chatSocket = socket;

	if (socket) {
		socket.emit('chat:conversation:join', {
			conversationId: chatPage.dataset.activeConversationId,
		});

		socket.on('chat:message:created', (payload) => {
			appendMessage(payload?.message, socket);
		});
		socket.on('chat:message:edited', (payload) => {
			updateMessage(payload?.message);
		});
		socket.on('chat:message:deleted', (payload) => {
			removeMessage(payload);
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

	if (!message) {
		focusComposerInput();
		return;
	}

	emitTypingState(socket, false);
	setComposerDisabled(true);
	let shouldRefocus = false;

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
		shouldRefocus = true;
	} catch (error) {
		console.error('Failed to send live chat message', error);
		composer.submit();
	} finally {
		setComposerDisabled(false);
		if (shouldRefocus) {
			focusComposerInput();
		}
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

	const wasAppended = messageRenderer.appendMessage(
		messageSurface,
		message,
		chatPage.dataset.currentUserId,
		{
			canFlagMessages: isRoomConversation,
			deleteLabel: chatPage.dataset.deleteMessageLabel || '',
			deleteUrl: chatPage.dataset.deleteMessageUrl || '',
			editLabel: chatPage.dataset.editMessageLabel || '',
			editUrl: chatPage.dataset.editMessageUrl || '',
			editedLabel: chatPage.dataset.messageEditedLabel || '',
			flagLabel: chatPage.dataset.flagMessageLabel || '',
			flaggedLabel: chatPage.dataset.messageFlaggedLabel || '',
			flagUrl: chatPage.dataset.flagMessageUrl || '',
			showSenderDisplay: isRoomConversation,
		},
	);

	if (!wasAppended) return;

	scheduleMessageMutationExpiryById(message.id);
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

function focusComposerInput() {
	const input = composer.elements.message;
	if (!input || input.disabled) return;

	input.focus({ preventScroll: true });
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

		messageRenderer.prependMessages(
			messageSurface,
			payload.messages,
			chatPage.dataset.currentUserId,
			{
				canFlagMessages: isRoomConversation,
				deleteLabel: chatPage.dataset.deleteMessageLabel || '',
				deleteUrl: chatPage.dataset.deleteMessageUrl || '',
				editLabel: chatPage.dataset.editMessageLabel || '',
				editUrl: chatPage.dataset.editMessageUrl || '',
				editedLabel: chatPage.dataset.messageEditedLabel || '',
				flagLabel: chatPage.dataset.flagMessageLabel || '',
				flaggedLabel: chatPage.dataset.messageFlaggedLabel || '',
				flagUrl: chatPage.dataset.flagMessageUrl || '',
				showSenderDisplay: isRoomConversation,
			},
		);
		hasOlderMessages = Boolean(payload.hasMore);
		chatPage.dataset.hasOlderMessages = hasOlderMessages ? 'true' : 'false';
		scheduleVisibleMessageMutationExpiries();
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

async function handleMessageActionClick(event) {
	const editButton = event.target.closest('[data-chat-message-edit]');
	if (!editButton) return;

	const row = editButton.closest('[data-chat-message-id]');
	if (!row || row.dataset.chatMessageCanEdit !== 'true') return;

	const currentBody = row.querySelector('.chat-message-text')?.textContent || '';
	const nextBody = window.prompt(
		chatPage.dataset.editMessagePrompt || '',
		currentBody,
	);

	if (nextBody === null) return;

	const normalizedBody = nextBody.trim();
	if (!normalizedBody || normalizedBody === currentBody.trim()) return;

	const fields = {
		messageId: row.dataset.chatMessageId,
		message: normalizedBody,
	};

	if (chatSocket) {
		editButton.disabled = true;

		try {
			const response = await emitWithAck(chatSocket, 'chat:message:edit', {
				conversationId: chatPage.dataset.activeConversationId,
				...fields,
			});

			if (response?.ok) {
				updateMessage(response.message);
				return;
			}
		} catch (error) {
			console.error('Failed to edit live chat message', error);
		} finally {
			editButton.disabled = false;
		}
	}

	submitMessageMutation(chatPage.dataset.editMessageUrl, fields);
}

async function handleMessageActionSubmit(event) {
	const deleteForm = event.target.closest('[data-chat-message-delete-form]');
	if (!deleteForm) return;

	const confirmed = window.confirm(chatPage.dataset.deleteMessageConfirm || '');
	if (!confirmed) {
		event.preventDefault();
		return;
	}

	if (!chatSocket) return;

	event.preventDefault();
	const submitButton = deleteForm.querySelector('button[type="submit"]');
	const messageId = deleteForm.elements.messageId?.value || '';
	submitButton.disabled = true;

	try {
		const response = await emitWithAck(chatSocket, 'chat:message:delete', {
			conversationId: chatPage.dataset.activeConversationId,
			messageId,
		});

		if (response?.ok) {
			removeMessage(response);
			return;
		}
	} catch (error) {
		console.error('Failed to delete live chat message', error);
	} finally {
		submitButton.disabled = false;
	}

	deleteForm.submit();
}

function submitMessageMutation(action, fields) {
	if (!action) return;

	const form = document.createElement('form');
	form.method = 'POST';
	form.action = action;
	form.hidden = true;

	for (const [name, value] of Object.entries(fields)) {
		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = name;
		input.value = value;
		form.appendChild(input);
	}

	document.body.appendChild(form);
	form.submit();
}

function updateMessage(message) {
	if (
		!message?.id ||
		message.conversationId !== chatPage.dataset.activeConversationId
	) {
		return;
	}

	messageRenderer.updateMessage(messageSurface, message, {
		editedLabel: chatPage.dataset.messageEditedLabel || '',
	});
	scheduleMessageMutationExpiryById(message.id);
}

function removeMessage(payload) {
	if (
		!payload?.messageId ||
		payload.conversationId !== chatPage.dataset.activeConversationId
	) {
		return;
	}

	messageRenderer.removeMessage(messageSurface, payload.messageId);
	clearMessageMutationExpiry(payload.messageId);
}

function scheduleVisibleMessageMutationExpiries() {
	if (!messageMutationWindowMs) return;

	messageSurface
		.querySelectorAll('[data-chat-message-id]')
		.forEach(scheduleMessageMutationExpiry);
}

function scheduleMessageMutationExpiryById(messageId) {
	if (!messageId || !messageMutationWindowMs) return;

	const row = messageSurface.querySelector(
		`[data-chat-message-id="${messageId}"]`,
	);
	if (row) {
		scheduleMessageMutationExpiry(row);
	}
}

function scheduleMessageMutationExpiry(row) {
	const messageId = row?.dataset.chatMessageId;
	if (!messageId || !row.querySelector('.chat-message-actions')) return;

	clearMessageMutationExpiry(messageId);

	const remainingMs = getRemainingMutationMs(row);
	if (remainingMs <= 0) {
		expireMessageMutationActions(row);
		return;
	}

	mutationExpiryTimers.set(
		messageId,
		window.setTimeout(() => {
			expireMessageMutationActions(row);
			mutationExpiryTimers.delete(messageId);
		}, remainingMs),
	);
}

function clearMessageMutationExpiry(messageId) {
	const timerId = mutationExpiryTimers.get(messageId);
	if (!timerId) return;

	window.clearTimeout(timerId);
	mutationExpiryTimers.delete(messageId);
}

function getRemainingMutationMs(row) {
	const createdAt = Date.parse(row.dataset.chatMessageCreatedAt || '');
	if (Number.isNaN(createdAt)) return 0;

	return createdAt + messageMutationWindowMs - Date.now();
}

function expireMessageMutationActions(row) {
	row.querySelector('.chat-message-actions')?.remove();
	row.dataset.chatMessageCanEdit = 'false';
	row.dataset.chatMessageCanDelete = 'false';
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

function setActiveSidePanel(panelName) {
	const isMembersVisible = panelName === 'members';
	const isManagementVisible = panelName === 'management';
	const isAnyPanelVisible = isMembersVisible || isManagementVisible;

	if (membersPanel) {
		membersPanel.hidden = !isMembersVisible;
	}
	if (managementPanel) {
		managementPanel.hidden = !isManagementVisible;
	}

	messageSurface.hidden = isAnyPanelVisible;
	if (typingIndicator) {
		typingIndicator.hidden = true;
	}
	if (composerNotice) {
		composerNotice.hidden = isAnyPanelVisible;
	}
	if (composer) {
		composer.hidden = isAnyPanelVisible;
	}

	membersToggle?.classList.toggle('is-active', isMembersVisible);
	membersToggle?.setAttribute(
		'aria-expanded',
		isMembersVisible ? 'true' : 'false',
	);
	managementToggle?.classList.toggle('is-active', isManagementVisible);
	managementToggle?.setAttribute(
		'aria-expanded',
		isManagementVisible ? 'true' : 'false',
	);

	if (isAnyPanelVisible) {
		clearTimeout(typingHideTimer);
		return;
	}

	focusComposerInput();
}

function setComposerDisabled(disabled) {
	composer
		.querySelectorAll('input, button')
		.forEach((element) => {
			element.disabled = disabled;
		});
}
