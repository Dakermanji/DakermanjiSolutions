//! public/js/chat/conversation.js

(() => {
	const chatPage = document.querySelector('[data-active-conversation-id]');
	const composer = document.querySelector('[data-chat-composer]');
	const composerNotice = document.querySelector('[data-chat-composer-notice]');
	const messageSurface = document.querySelector('[data-chat-message-surface]');
	const typingIndicator = document.querySelector('[data-chat-typing-indicator]');
	const messageRenderer = window.ChatConversationRenderer;

	if (!chatPage || !messageSurface || !messageRenderer) return;

	const activityPanel = window.ChatConversationActivity.createActivityPanel({
		chatPage,
		labelsNode: document.querySelector('[data-chat-activity-labels]'),
		list: document.querySelector('[data-chat-activity-list]'),
		loadMoreButton: document.querySelector('[data-chat-activity-load-more]'),
		state: document.querySelector('[data-chat-activity-state]'),
		count: document.querySelector('[data-chat-activity-count]'),
	});
	const typingController =
		window.ChatConversationSocket.createTypingController({
			chatPage,
			typingIndicator,
		});
	const sidePanels = window.ChatConversationPanels.createSidePanelController({
		composer,
		composerNotice,
		messageSurface,
		typingIndicator,
		focusComposerInput,
		clearTypingTimers: typingController.clearTypingTimers,
		panels: {
			activity: document.querySelector('[data-chat-activity-panel]'),
			flags: document.querySelector('[data-chat-flags-panel]'),
			management: document.querySelector('[data-chat-management-panel]'),
			members: document.querySelector('[data-chat-members-panel]'),
		},
		toggles: {
			activity: document.querySelector('[data-chat-activity-toggle]'),
			flags: document.querySelector('[data-chat-flags-toggle]'),
			management: document.querySelector('[data-chat-management-toggle]'),
			members: document.querySelector('[data-chat-members-toggle]'),
		},
	});
	const flagReviewPanel =
		window.ChatConversationFlagReview.createFlagReviewPanel({
			chatPage,
			list: document.querySelector('[data-chat-flags-list]'),
			state: document.querySelector('[data-chat-flags-state]'),
			count: document.querySelector('[data-chat-flags-count]'),
			messageSurface,
			setActiveSidePanel: sidePanels.setActiveSidePanel,
		});

	let chatSocket = null;
	const messages = window.ChatConversationMessages.createMessageController({
		chatPage,
		composer,
		messageRenderer,
		messageSurface,
		focusComposerInput,
		hideTypingIndicator: typingController.hideTypingIndicator,
		getChatSocket: () => chatSocket,
	});

	requestAnimationFrame(async () => {
		messageRenderer.rebuildMessageDateSeparators(messageSurface);
		messages.scrollToLatestMessage();
		if (composer) {
			focusComposerInput();
		}
		await messages.fillScrollableHistory();
		if (chatPage.dataset.focusMessageId) {
			await messages.focusMessageById(chatPage.dataset.focusMessageId);
			chatPage.dataset.focusMessageId = '';
		}
		messages.scheduleVisibleMessageMutationExpiries();
	});

	messageSurface.addEventListener('scroll', () => {
		if (messageSurface.scrollTop > 80) return;

		void messages.loadOlderMessages();
	});
	messageSurface.addEventListener('click', messages.handleMessageActionClick);
	messageSurface.addEventListener('input', messages.handleMessageActionInput);
	messageSurface.addEventListener('keydown', messages.handleMessageActionKeydown);
	messageSurface.addEventListener('submit', messages.handleMessageActionSubmit);
	messageSurface.addEventListener('mouseover', messages.handleReactionDetailsOver);
	messageSurface.addEventListener('mouseout', messages.handleReactionDetailsOut);
	messageSurface.addEventListener('focusin', messages.handleReactionDetailsFocusIn);
	messageSurface.addEventListener('focusout', messages.handleReactionDetailsFocusOut);
	document.addEventListener('click', messages.handleReactionOutsideClick);

	bindPanelToggle({
		toggle: document.querySelector('[data-chat-members-toggle]'),
		panel: document.querySelector('[data-chat-members-panel]'),
		panelName: 'members',
	});
	bindPanelToggle({
		toggle: document.querySelector('[data-chat-management-toggle]'),
		panel: document.querySelector('[data-chat-management-panel]'),
		panelName: 'management',
	});
	bindPanelToggle({
		toggle: document.querySelector('[data-chat-activity-toggle]'),
		panel: document.querySelector('[data-chat-activity-panel]'),
		panelName: 'activity',
		onOpen: activityPanel.loadActivityLogs,
	});
	bindPanelToggle({
		toggle: document.querySelector('[data-chat-flags-toggle]'),
		panel: document.querySelector('[data-chat-flags-panel]'),
		panelName: 'flags',
		onOpen: flagReviewPanel.loadFlagReviewQueue,
	});

	document
		.querySelector('[data-chat-activity-load-more]')
		?.addEventListener('click', () => {
			void activityPanel.loadActivityLogs();
		});
	document
		.querySelector('[data-chat-flags-list]')
		?.addEventListener('click', flagReviewPanel.handleFlagReviewClick);
	document
		.querySelector('[data-chat-flags-list]')
		?.addEventListener('submit', flagReviewPanel.handleFlagReviewSubmit);

	if (composer) {
		chatSocket = window.ChatConversationSocket.connectChatSocket();
		bindChatSocket(chatSocket);
		syncComposerInputDirection();
		composer
			.querySelector('[data-chat-reply-clear]')
			?.addEventListener('click', () => {
				messages.clearReplyTarget();
				focusComposerInput();
			});
	}

	function bindPanelToggle({ toggle, panel, panelName, onOpen = null }) {
		toggle?.addEventListener('click', () => {
			const shouldShowPanel = panel?.hidden !== false;
			sidePanels.setActiveSidePanel(shouldShowPanel ? panelName : null);
			if (shouldShowPanel) {
				void onOpen?.();
			}
		});
	}

	function bindChatSocket(socket) {
		if (!socket) return;

		socket.emit('chat:conversation:join', {
			conversationId: chatPage.dataset.activeConversationId,
		});

		socket.on('chat:message:created', (payload) => {
			messages.appendMessage(payload?.message, socket);
		});
		socket.on('chat:message:edited', (payload) => {
			messages.updateMessage(payload?.message);
		});
		socket.on('chat:message:deleted', (payload) => {
			messages.removeMessage(payload);
		});
		socket.on('chat:message:reactions', (payload) => {
			messages.updateMessageReactions(payload);
		});
		socket.on('chat:typing:updated', (payload) => {
			typingController.showTypingIndicator(payload);
		});

		composer.addEventListener('submit', (event) => {
			event.preventDefault();
			typingController.emitTypingState(socket, false);
			void messages.submitLiveMessage(socket);
		});

		const input = composer.elements.message;
		input?.addEventListener('input', () => {
			syncComposerInputDirection();
			typingController.handleTypingInput(socket, input);
		});
		input?.addEventListener('blur', () => {
			typingController.emitTypingState(socket, false);
		});
	}

	function focusComposerInput() {
		const input = composer?.elements.message;
		if (!input || input.disabled) return;

		input.focus({ preventScroll: true });
	}

	function syncComposerInputDirection() {
		const input = composer?.elements.message;
		if (!input) return;

		input.dir = getTextDirection(input.value);
	}

	function getTextDirection(value) {
		for (const character of String(value || '')) {
			if (/[\u0590-\u08ff\ufb1d-\ufdff\ufe70-\ufefc]/.test(character)) {
				return 'rtl';
			}
			if (/[A-Za-z]/.test(character)) {
				return 'ltr';
			}
		}

		return 'auto';
	}
})();

