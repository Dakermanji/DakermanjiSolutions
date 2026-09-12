//! public/js/chat/conversation-page/messages.js

(() => {
	const {
		emitWithAck,
		escapeCssIdentifier,
		setFormControlsDisabled,
		showFlashMessage,
	} = window.ChatConversationUtils;
	const { createFlagController } = window.ChatConversationMessageFlags;
	const { createHistoryController } = window.ChatConversationMessageHistory;
	const { createMutationController } = window.ChatConversationMessageMutations;
	const { createReactionController } = window.ChatConversationMessageReactions;
	const { createReplyController } = window.ChatConversationMessageReply;
	const { createMentionController } = window.ChatConversationMessageMentions;

	function createMessageController({
		chatPage,
		composer,
		messageRenderer,
		messageSurface,
		focusComposerInput,
		hideTypingIndicator,
		getChatSocket,
		onMessagesChanged = null,
		syncComposerInputDirection = null,
	}) {
		const isRoomConversation =
			chatPage?.dataset.chatConversationKind === 'room';
		const quickReactions = parseReactionOptions(
			chatPage?.dataset.quickReactions,
		);
		const extraReactions = parseReactionOptions(
			chatPage?.dataset.extraReactions,
		);

		const replyController = createReplyController({
			chatPage,
			composer,
			focusComposerInput,
		});
		const mutationController = createMutationController({
			chatPage,
			getChatSocket,
			messageRenderer,
			messageSurface,
		});
		const historyController = createHistoryController({
			chatPage,
			messageRenderer,
			messageSurface,
			getRendererOptions,
			scheduleVisibleMessageMutationExpiries:
				mutationController.scheduleVisibleMessageMutationExpiries,
		});
		const reactionController = createReactionController({
			chatPage,
			extraReactions,
			messageRenderer,
			messageSurface,
			quickReactions,
		});
		const flagController = createFlagController({ chatPage });
		const mentionController = createMentionController({
			chatPage,
			composer,
			focusComposerInput,
		});

		async function submitLiveMessage(socket) {
			const input = composer.elements.message;
			const message = String(input?.value || '').trim();

			if (!message) {
				focusComposerInput();
				return;
			}

			setFormControlsDisabled(composer, true);
			let shouldRefocus = false;

			try {
				const replyToMessageId =
					composer.elements.replyToMessageId?.value || '';
				const response = await emitWithAck(socket, 'chat:message:create', {
					conversationId: chatPage.dataset.activeConversationId,
					replyToMessageId,
					message,
				});

				if (response?.reason === 'rate_limited') {
					showFlashMessage(
						chatPage.dataset.messageRateLimitedLabel ||
							chatPage.dataset.messageErrorLabel ||
							'',
					);
					shouldRefocus = true;
					return;
				}

				if (!response?.ok) {
					submitComposerFallback();
					return;
				}

				appendMessage(response.message, socket);
				input.value = '';
				syncComposerInputDirection?.();
				if (composer.elements.replyToMessageId) {
					replyController.clearReplyTarget();
				}
				shouldRefocus = true;
			} catch (error) {
				console.error('Failed to send live chat message', error);
				submitComposerFallback();
			} finally {
				setFormControlsDisabled(composer, false);
				if (shouldRefocus) {
					focusComposerInput();
				}
			}
		}

		function submitComposerFallback() {
			setFormControlsDisabled(composer, false);
			window.AppCsrf?.addToForm(composer);
			composer.submit();
		}

		function appendMessage(message, socket = null) {
			if (
				!message?.id ||
				message.conversationId !== chatPage.dataset.activeConversationId
			) {
				return;
			}

			const shouldScrollToLatest =
				message.sender?.id === chatPage.dataset.currentUserId ||
				isScrolledNearLatestMessage();
			const wasAppended = messageRenderer.appendMessage(
				messageSurface,
				message,
				chatPage.dataset.currentUserId,
				getRendererOptions(),
			);

			if (!wasAppended) return;

			mutationController.scheduleMessageMutationExpiryById(message.id);
			hideTypingIndicator();
			if (
				!shouldScrollToLatest &&
				message.sender?.id !== chatPage.dataset.currentUserId
			) {
				addUnreadDividerBeforeMessage(message.id);
			}
			if (shouldScrollToLatest) scrollToLatestMessage();
			onMessagesChanged?.();
		}

		function addUnreadDividerBeforeMessage(messageId) {
			if (messageSurface.querySelector('[data-chat-unread-divider]')) return;

			const messageRow = messageSurface.querySelector(
				`[data-chat-message-id="${escapeCssIdentifier(messageId)}"]`,
			);
			if (!messageRow) return;

			const divider = document.createElement('li');
			const label = chatPage.dataset.unreadDividerLabel || '';
			divider.className = 'chat-unread-divider';
			divider.dataset.chatUnreadDivider = 'true';
			divider.setAttribute('role', 'separator');
			divider.setAttribute('aria-label', label);

			const text = document.createElement('span');
			text.textContent = label;
			divider.appendChild(text);
			messageRow.before(divider);
		}

		function isScrolledNearLatestMessage() {
			return (
				messageSurface.scrollHeight -
					messageSurface.scrollTop -
					messageSurface.clientHeight <=
				48
			);
		}

		function scrollToLatestMessage() {
			messageSurface.scrollTop = messageSurface.scrollHeight;
		}

		function scrollToUnreadDivider() {
			const divider = messageSurface.querySelector('[data-chat-unread-divider]');
			if (!divider) return false;

			messageSurface.scrollTop = Math.max(0, divider.offsetTop - 12);
			return true;
		}

		async function handleMessageActionClick(event) {
			if (await reactionController.handleActionClick(event)) return;

			const replyButton = event.target.closest('[data-chat-message-reply]');
			if (replyButton) {
				const row = replyButton.closest('[data-chat-message-id]');
				replyController.setReplyTarget(row);
				return;
			}

			const editButton = event.target.closest('[data-chat-message-edit]');
			await mutationController.handleEditClick(editButton);
		}

		async function handleMessageActionKeydown(event) {
			await reactionController.handleActionKeydown(event);
		}

		async function handleMessageActionSubmit(event) {
			if (await reactionController.handleActionSubmit(event)) return;

			const flagForm = event.target.closest('.chat-message-flag-form');
			if (flagForm) {
				event.preventDefault();
				await flagController.submitMessageFlag(flagForm);
				return;
			}

			const deleteForm = event.target.closest(
				'[data-chat-message-delete-form]',
			);
			await mutationController.handleDeleteSubmit(event, deleteForm);
		}

		function handleMessageActionInput(event) {
			reactionController.handleActionInput(event);
		}

		function getRendererOptions() {
			return {
				canFlagMessages: isRoomConversation,
				deleteLabel: chatPage.dataset.deleteMessageLabel || '',
				deleteUrl: chatPage.dataset.deleteMessageUrl || '',
				editLabel: chatPage.dataset.editMessageLabel || '',
				editUrl: chatPage.dataset.editMessageUrl || '',
				editedLabel: chatPage.dataset.messageEditedLabel || '',
				flagLabel: chatPage.dataset.flagMessageLabel || '',
				flaggedLabel: chatPage.dataset.messageFlaggedLabel || '',
				flagUrl: chatPage.dataset.flagMessageUrl || '',
				extraReactions,
				quickReactions,
				reactionUrl: chatPage.dataset.reactMessageUrl || '',
				replyLabel: chatPage.dataset.replyMessageLabel || '',
				pendingApprovalLabel:
					chatPage.dataset.messageWaitingApprovalLabel || '',
				replyDeletedLabel: chatPage.dataset.replyDeletedLabel || '',
				showSenderDisplay: isRoomConversation,
			};
		}

		return {
			appendMessage,
			clearReplyTarget: replyController.clearReplyTarget,
			fillScrollableHistory: historyController.fillScrollableHistory,
			focusMessageById: historyController.focusMessageById,
			handleMessageActionClick,
			handleMessageActionInput,
			handleMessageActionKeydown,
			handleMessageActionSubmit,
			handleMentionBlur: mentionController.handleBlur,
			handleReactionOutsideClick: reactionController.handleOutsideClick,
			handleReactionDetailsFocusIn:
				reactionController.handleReactionDetailsFocusIn,
			handleReactionDetailsFocusOut:
				reactionController.handleReactionDetailsFocusOut,
			handleMentionInput: mentionController.handleInput,
			handleMentionKeydown: mentionController.handleKeydown,
			handleMentionOutsideClick: mentionController.handleOutsideClick,
			handleReactionDetailsOut: reactionController.handleReactionDetailsOut,
			handleReactionDetailsOver: reactionController.handleReactionDetailsOver,
			loadOlderMessages: historyController.loadOlderMessages,
			removeMessage: mutationController.removeMessage,
			updateMessageReactions: reactionController.updateLiveMessageReactions,
			scheduleVisibleMessageMutationExpiries:
				mutationController.scheduleVisibleMessageMutationExpiries,
			scrollToLatestMessage,
			scrollToUnreadDivider,
			submitLiveMessage,
			updateMessage: mutationController.updateMessage,
		};
	}

	function parseReactionOptions(value) {
		try {
			const reactions = JSON.parse(value || '[]');
			return Array.isArray(reactions) ? reactions : [];
		} catch (error) {
			return [];
		}
	}

	window.ChatConversationMessages = {
		createMessageController,
	};
})();
