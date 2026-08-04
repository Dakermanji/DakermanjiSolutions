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
		let typingHideTimer = null;
		let isTyping = false;

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

		function clearTypingTimers() {
			clearTimeout(typingStopTimer);
			clearTimeout(typingHideTimer);
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
