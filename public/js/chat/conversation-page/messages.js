//! public/js/chat/conversation-page/messages.js

(() => {
	const {
		emitWithAck,
		escapeCssIdentifier,
		setFormControlsDisabled,
		showFlashMessage,
	} = window.ChatConversationUtils;

	function createMessageController({
		chatPage,
		composer,
		messageRenderer,
		messageSurface,
		focusComposerInput,
		hideTypingIndicator,
		getChatSocket,
	}) {
		let isLoadingOlderMessages = false;
		let hasOlderMessages = chatPage?.dataset.hasOlderMessages === 'true';
		const mutationExpiryTimers = new Map();
		const isRoomConversation =
			chatPage?.dataset.chatConversationKind === 'room';
		const messageMutationWindowMs = Number(
			chatPage?.dataset.messageMutationWindowMs || 0,
		);

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
				if (composer.elements.replyToMessageId) {
					clearReplyTarget();
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

		async function loadOlderMessages() {
			if (isLoadingOlderMessages || !hasOlderMessages) return false;

			const oldestMessage = messageSurface.querySelector(
				'[data-chat-message-id]',
			);
			if (!oldestMessage) {
				hasOlderMessages = false;
				return false;
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
					getRendererOptions(),
				);
				hasOlderMessages = Boolean(payload.hasMore);
				chatPage.dataset.hasOlderMessages = hasOlderMessages
					? 'true'
					: 'false';
				scheduleVisibleMessageMutationExpiries();
				return true;
			} catch (error) {
				console.error('Failed to load older chat messages', error);
				return false;
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

		async function focusMessageById(messageId) {
			if (!messageId) return false;

			let row = findMessageRow(messageId);

			while (!row && hasOlderMessages) {
				const loadedOlderMessages = await loadOlderMessages();
				if (!loadedOlderMessages) break;
				row = findMessageRow(messageId);
			}

			if (!row) {
				showFocusMessageState();
				return false;
			}

			clearFocusMessageState();
			row.scrollIntoView({ block: 'center', behavior: 'smooth' });
			row.classList.add('is-context-focused');
			window.setTimeout(() => {
				row.classList.remove('is-context-focused');
			}, 2200);

			return true;
		}

		function findMessageRow(messageId) {
			return messageSurface.querySelector(
				`[data-chat-message-id="${escapeCssIdentifier(messageId)}"]`,
			);
		}

		function showFocusMessageState() {
			clearFocusMessageState();

			const message = chatPage.dataset.focusMessageMissingLabel || '';
			if (!message) return;

			const notice = document.createElement('div');
			notice.className = 'chat-focus-state';
			notice.dataset.chatFocusState = 'true';
			notice.setAttribute('role', 'status');
			notice.innerHTML = '<i class="bi bi-clock-history" aria-hidden="true"></i>';

			const text = document.createElement('span');
			text.textContent = message;
			notice.appendChild(text);

			messageSurface.prepend(notice);
		}

		function clearFocusMessageState() {
			messageSurface
				.querySelectorAll('[data-chat-focus-state]')
				.forEach((notice) => notice.remove());
		}

		async function handleMessageActionClick(event) {
			const replyButton = event.target.closest('[data-chat-message-reply]');
			if (replyButton) {
				const row = replyButton.closest('[data-chat-message-id]');
				setReplyTarget(row);
				return;
			}

			const editButton = event.target.closest('[data-chat-message-edit]');
			if (!editButton) return;

			const row = editButton.closest('[data-chat-message-id]');
			if (!row || row.dataset.chatMessageCanEdit !== 'true') return;

			const currentBody =
				row.querySelector('.chat-message-text')?.textContent || '';
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
			const flagForm = event.target.closest('.chat-message-flag-form');
			if (flagForm) {
				event.preventDefault();
				await submitMessageFlag(flagForm);
				return;
			}

			const deleteForm = event.target.closest(
				'[data-chat-message-delete-form]',
			);
			if (!deleteForm) return;

			const confirmed = window.confirm(
				chatPage.dataset.deleteMessageConfirm || '',
			);
			if (!confirmed) {
				event.preventDefault();
				return;
			}

			const socket = getChatSocket?.();
			if (!socket) return;

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
					return;
				}
			} catch (error) {
				console.error('Failed to delete live chat message', error);
			} finally {
				submitButton.disabled = false;
			}

			deleteForm.submit();
		}

		async function submitMessageFlag(form) {
			const row = form.closest('[data-chat-message-id]');
			const button = form.querySelector('button[type="submit"]');
			const icon = button?.querySelector('i');
			const messageId = form.elements.messageId?.value || row?.dataset.chatMessageId;
			if (!row || !button || !messageId || button.disabled) return;

			const fields = new URLSearchParams(new FormData(form));
			setFormControlsDisabled(form, true);

			try {
				const response = await fetch(form.action, {
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: fields.toString(),
					credentials: 'same-origin',
				});
				const payload = await response.json();

				if (!response.ok || !payload?.ok) {
					throw new Error(`Request failed with status ${response.status}`);
				}

				row.dataset.chatMessageFlaggedByViewer = 'true';
				button.classList.add('is-flagged');
				button.dataset.bsTitle = chatPage.dataset.messageFlaggedLabel || '';
				button.setAttribute(
					'aria-label',
					chatPage.dataset.messageFlaggedLabel || '',
				);
				button.disabled = true;

				if (icon) {
					icon.className = 'bi bi-flag-fill';
				}

				window.AppTooltips?.initIn(form);
			} catch (error) {
				console.error('Failed to flag chat message', error);
				showFlashMessage(chatPage.dataset.flagMessageErrorLabel || '');
				setFormControlsDisabled(form, false);
			}
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

		function setReplyTarget(row) {
			if (!row || !composer?.elements.replyToMessageId) return;

			const messageId = row.dataset.chatMessageId || '';
			const senderName = row.dataset.chatMessageSenderName || '';
			const preview =
				row.querySelector('.chat-message-text')?.textContent?.replace(/\s+/g, ' ').trim() || '';

			if (!messageId) return;

			composer.elements.replyToMessageId.value = messageId;
			updateReplyPreview({
				preview,
				senderName,
			});
			focusComposerInput();
		}

		function updateReplyPreview({ preview = '', senderName = '' } = {}) {
			const previewShell = composer?.querySelector('[data-chat-reply-preview]');
			if (!previewShell) return;

			const userLabel = previewShell.querySelector('[data-chat-reply-preview-user]');
			const previewText = previewShell.querySelector('[data-chat-reply-preview-text]');
			const labelTemplate = chatPage.dataset.replyingToLabel || '';
			const label = labelTemplate.replace('{{user}}', senderName);

			if (userLabel) {
				userLabel.textContent = label;
			}
			if (previewText) {
				previewText.textContent = preview;
			}

			previewShell.hidden = false;
			window.AppTooltips?.initIn(previewShell);
		}

		function clearReplyTarget() {
			if (composer?.elements.replyToMessageId) {
				composer.elements.replyToMessageId.value = '';
			}

			const previewShell = composer?.querySelector('[data-chat-reply-preview]');
			if (previewShell) {
				previewShell.hidden = true;
			}
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
				replyLabel: chatPage.dataset.replyMessageLabel || '',
				replyDeletedLabel: chatPage.dataset.replyDeletedLabel || '',
				showSenderDisplay: isRoomConversation,
			};
		}

		return {
			appendMessage,
			fillScrollableHistory,
			focusMessageById,
			handleMessageActionClick,
			handleMessageActionSubmit,
			loadOlderMessages,
			removeMessage,
			scheduleVisibleMessageMutationExpiries,
			scrollToLatestMessage,
			submitLiveMessage,
			updateMessage,
			clearReplyTarget,
		};
	}

	window.ChatConversationMessages = {
		createMessageController,
	};
})();
