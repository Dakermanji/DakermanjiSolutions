//! public/js/chat/conversation-page/messages-mutations.js

(() => {
	const { emitWithAck } = window.ChatConversationUtils;

	function createMutationController({
		chatPage,
		getChatSocket,
		messageRenderer,
		messageSurface,
	}) {
		const mutationExpiryTimers = new Map();
		const messageMutationWindowMs = Number(
			chatPage?.dataset.messageMutationWindowMs || 0,
		);

		async function handleEditClick(editButton) {
			if (!editButton) return false;

			const row = editButton.closest('[data-chat-message-id]');
			if (!row || row.dataset.chatMessageCanEdit !== 'true') return true;

			const currentBody =
				row.querySelector('.chat-message-text')?.textContent || '';
			const nextBody = window.prompt(
				chatPage.dataset.editMessagePrompt || '',
				currentBody,
			);

			if (nextBody === null) return true;

			const normalizedBody = nextBody.trim();
			if (!normalizedBody || normalizedBody === currentBody.trim()) return true;

			const fields = {
				messageId: row.dataset.chatMessageId,
				message: normalizedBody,
			};
			const socket = getChatSocket?.();

			if (socket) {
				editButton.disabled = true;

				try {
					const response = await emitWithAck(socket, 'chat:message:edit', {
						conversationId: chatPage.dataset.activeConversationId,
						...fields,
					});

					if (response?.ok) {
						updateMessage(response.message);
						return true;
					}
				} catch (error) {
					console.error('Failed to edit live chat message', error);
				} finally {
					editButton.disabled = false;
				}
			}

			submitMessageMutation(chatPage.dataset.editMessageUrl, fields);
			return true;
		}

		async function handleDeleteSubmit(event, deleteForm) {
			if (!deleteForm) return false;

			const confirmed = window.confirm(
				chatPage.dataset.deleteMessageConfirm || '',
			);
			if (!confirmed) {
				event.preventDefault();
				return true;
			}

			const socket = getChatSocket?.();
			if (!socket) return false;

			event.preventDefault();
			const submitButton = deleteForm.querySelector('button[type="submit"]');
			const messageId = deleteForm.elements.messageId?.value || '';
			submitButton.disabled = true;

			try {
				const response = await emitWithAck(socket, 'chat:message:delete', {
					conversationId: chatPage.dataset.activeConversationId,
					messageId,
				});

				if (response?.ok) {
					removeMessage(response);
					return true;
				}
			} catch (error) {
				console.error('Failed to delete live chat message', error);
			} finally {
				submitButton.disabled = false;
			}

			deleteForm.submit();
			return true;
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
				replyDeletedLabel: chatPage.dataset.replyDeletedLabel || '',
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
			const canEditOrDelete =
				row?.dataset.chatMessageCanEdit === 'true' ||
				row?.dataset.chatMessageCanDelete === 'true';
			if (!messageId || !canEditOrDelete) return;

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
			row.querySelector('[data-chat-message-edit]')?.remove();
			row.querySelector('[data-chat-message-delete-form]')?.remove();
			row.dataset.chatMessageCanEdit = 'false';
			row.dataset.chatMessageCanDelete = 'false';
		}

		return {
			handleDeleteSubmit,
			handleEditClick,
			removeMessage,
			scheduleMessageMutationExpiryById,
			scheduleVisibleMessageMutationExpiries,
			updateMessage,
		};
	}

	window.ChatConversationMessageMutations = {
		createMutationController,
	};
})();
