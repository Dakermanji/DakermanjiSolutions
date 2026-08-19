//! public/js/chat/conversation-page/messages.js

(() => {
	const {
		emitWithAck,
		setFormControlsDisabled,
	} = window.ChatConversationUtils;
	const { createFlagController } = window.ChatConversationMessageFlags;
	const { createHistoryController } = window.ChatConversationMessageHistory;
	const { createMutationController } = window.ChatConversationMessageMutations;
	const { createReactionController } = window.ChatConversationMessageReactions;
	const { createReplyController } = window.ChatConversationMessageReply;

	function createMessageController({
		chatPage,
		composer,
		messageRenderer,
		messageSurface,
		focusComposerInput,
		hideTypingIndicator,
		getChatSocket,
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

				if (!response?.ok) {
					submitComposerFallback();
					return;
				}

				appendMessage(response.message, socket);
				input.value = '';
				input.dir = 'auto';
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
			composer.submit();
		}

		function appendMessage(message, socket = null) {
			if (
				!message?.id ||
				message.conversationId !== chatPage.dataset.activeConversationId
			) {
				return;
			}

			const wasAppended = messageRenderer.appendMessage(
				messageSurface,
				message,
				chatPage.dataset.currentUserId,
				getRendererOptions(),
			);

			if (!wasAppended) return;

			mutationController.scheduleMessageMutationExpiryById(message.id);
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
			handleReactionDetailsFocusIn:
				reactionController.handleReactionDetailsFocusIn,
			handleReactionDetailsFocusOut:
				reactionController.handleReactionDetailsFocusOut,
			handleReactionDetailsOut: reactionController.handleReactionDetailsOut,
			handleReactionDetailsOver: reactionController.handleReactionDetailsOver,
			loadOlderMessages: historyController.loadOlderMessages,
			removeMessage: mutationController.removeMessage,
			scheduleVisibleMessageMutationExpiries:
				mutationController.scheduleVisibleMessageMutationExpiries,
			scrollToLatestMessage,
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
