//! public/js/chat/conversation-page/socket.js

(() => {
	function connectChatSocket() {
		if (typeof window.io !== 'function') return null;

		return window.io({
			withCredentials: true,
		});
	}

	function createTypingController({ chatPage, typingIndicator }) {
		let typingStopTimer = null;
		let isTyping = false;
		const typingUsers = new Map();
		const typingUserTimers = new Map();

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
			if (!socket || isTyping === nextIsTyping) return;

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
				removeTypingUser(payload.userId);
				return;
			}

			setTypingUser(payload);
			renderTypingIndicator();
		}

		function setTypingUser(payload) {
			const userId = String(payload?.userId || '');
			if (!userId) return;

			typingUsers.set(userId, getTypingUserName(payload));
			clearTypingUserTimer(userId);
			typingUserTimers.set(
				userId,
				setTimeout(() => {
					removeTypingUser(userId);
				}, 2500),
			);
		}

		function getTypingUserName(payload) {
			return (
				String(payload?.userName || '').trim() ||
				chatPage.dataset.typingUnknownLabel ||
				''
			);
		}

		function removeTypingUser(userId) {
			if (!userId) return;

			typingUsers.delete(userId);
			clearTypingUserTimer(userId);
			renderTypingIndicator();
		}

		function clearTypingUserTimer(userId) {
			const timerId = typingUserTimers.get(userId);
			if (!timerId) return;

			clearTimeout(timerId);
			typingUserTimers.delete(userId);
		}

		function renderTypingIndicator() {
			if (!typingIndicator) return;

			const names = [...typingUsers.values()];
			if (names.length === 0) {
				hideTypingIndicator();
				return;
			}

			typingIndicator.querySelector('span').textContent =
				formatTypingLabel(names);
			typingIndicator.hidden = false;
		}

		function formatTypingLabel(names) {
			if (names.length === 1) {
				return replaceTemplate(
					chatPage.dataset.typingOneLabel || '',
					'user',
					names[0],
				);
			}

			if (names.length === 2) {
				return replaceTemplate(
					chatPage.dataset.typingTwoLabel || '',
					'users',
					names.join(chatPage.dataset.typingJoiner || ' and '),
				);
			}

			return chatPage.dataset.typingManyLabel || '';
		}

		function replaceTemplate(template, key, value) {
			return String(template || '').replace(`{{${key}}}`, value);
		}

		function hideTypingIndicator() {
			if (!typingIndicator) return;

			typingIndicator.hidden = true;
		}

		function clearTypingTimers() {
			clearTimeout(typingStopTimer);
			for (const userId of typingUserTimers.keys()) {
				clearTypingUserTimer(userId);
			}
			typingUsers.clear();
			hideTypingIndicator();
		}

		return {
			clearTypingTimers,
			emitTypingState,
			handleTypingInput,
			hideTypingIndicator,
			showTypingIndicator,
		};
	}

	window.ChatConversationSocket = {
		connectChatSocket,
		createTypingController,
	};
})();
