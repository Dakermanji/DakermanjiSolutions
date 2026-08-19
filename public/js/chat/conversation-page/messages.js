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
		const quickReactions = parseQuickReactions(
			chatPage?.dataset.quickReactions,
		);
		const extraReactions = parseQuickReactions(
			chatPage?.dataset.extraReactions,
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
				input.dir = 'auto';
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
			const reactionSummaryItem = event.target.closest(
				'[data-chat-message-reaction-summary-item]',
			);
			if (
				reactionSummaryItem &&
				!event.target.closest('[data-chat-message-reaction-details]')
			) {
				await toggleSummaryReaction(reactionSummaryItem);
				return;
			}

			const reactionToggle = event.target.closest(
				'[data-chat-message-reaction-toggle]',
			);
			if (reactionToggle) {
				toggleReactionMenu(reactionToggle);
				return;
			}

			const reactionMore = event.target.closest(
				'[data-chat-message-reaction-more]',
			);
			if (reactionMore) {
				toggleExtraReactions(reactionMore);
				return;
			}

			const reactionSearchToggle = event.target.closest(
				'[data-chat-message-reaction-search-toggle]',
			);
			if (reactionSearchToggle) {
				toggleReactionSearch(reactionSearchToggle);
				return;
			}

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

		async function handleMessageActionKeydown(event) {
			const reactionSummaryItem = event.target.closest(
				'[data-chat-message-reaction-summary-item]',
			);
			if (!reactionSummaryItem) return;
			if (!['Enter', ' '].includes(event.key)) return;

			event.preventDefault();
			await toggleSummaryReaction(reactionSummaryItem);
		}

		async function handleMessageActionSubmit(event) {
			const reactionForm = event.target.closest(
				'[data-chat-message-reaction-form]',
			);
			if (reactionForm) {
				event.preventDefault();
				await submitMessageReaction(reactionForm);
				return;
			}

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

		function handleMessageActionInput(event) {
			const input = event.target.closest(
				'[data-chat-message-reaction-search-input]',
			);
			if (!input) return;

			filterReactionMenu(input);
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

		async function submitMessageReaction(form) {
			const row = form.closest('[data-chat-message-id]');
			const button = form.querySelector('button[type="submit"]');
			if (!row || !button || button.disabled) return;

			const fields = new URLSearchParams(new FormData(form));
			setFormControlsDisabled(form, true);

			try {
				await toggleMessageReaction(row, fields);
				closeReactionMenus();
			} catch (error) {
				console.error('Failed to react to chat message', error);
				showFlashMessage(chatPage.dataset.flagMessageErrorLabel || '');
			} finally {
				setFormControlsDisabled(form, false);
			}
		}

		async function toggleSummaryReaction(item) {
			const row = item.closest('[data-chat-message-id]');
			const messageId = item.dataset.messageId || row?.dataset.chatMessageId || '';
			const reaction = item.dataset.reaction || '';
			if (!row || !messageId || !reaction) return;
			if (item.dataset.reactionToggleLoading === 'true') return;

			const fields = new URLSearchParams({ messageId, reaction });
			item.dataset.reactionToggleLoading = 'true';
			item.setAttribute('aria-disabled', 'true');

			try {
				await toggleMessageReaction(row, fields);
			} catch (error) {
				console.error('Failed to react to chat message summary', error);
				showFlashMessage(chatPage.dataset.flagMessageErrorLabel || '');
			} finally {
				item.dataset.reactionToggleLoading = 'false';
				item.removeAttribute('aria-disabled');
			}
		}

		async function toggleMessageReaction(row, fields) {
			const response = await fetch(chatPage.dataset.reactMessageUrl || '', {
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

			updateMessageReactions(row, payload.reactions || []);
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

		function updateMessageReactions(row, reactions) {
			if (!row) return;

			messageRenderer.updateMessageReactionList(messageSurface, row.dataset.chatMessageId, reactions, {
				extraReactions,
				quickReactions,
				reactionUrl: chatPage.dataset.reactMessageUrl || '',
			});
		}

		function toggleReactionMenu(button) {
			const picker = button.closest('[data-chat-message-reactions]');
			const menu = picker?.querySelector('[data-chat-message-reaction-menu]');
			if (!picker || !menu) return;

			const shouldOpen = menu.hidden;
			closeReactionMenus(picker);
			menu.hidden = !shouldOpen;
			button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
		}

		function toggleExtraReactions(button) {
			const picker = button.closest('[data-chat-message-reactions]');
			const extra = picker?.querySelector('[data-chat-message-reaction-extra]');
			if (!extra) return;

			const shouldOpen = extra.hidden;
			extra.hidden = !shouldOpen;
			button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
			setReactionMoreIcon(button, shouldOpen);
		}

		function toggleReactionSearch(button) {
			const picker = button.closest('[data-chat-message-reactions]');
			const search = picker?.querySelector('[data-chat-message-reaction-search]');
			const input = picker?.querySelector('[data-chat-message-reaction-search-input]');
			if (!search || !input) return;

			const shouldOpen = search.hidden;
			search.hidden = !shouldOpen;
			button.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');

			if (shouldOpen) {
				input.focus();
				return;
			}

			input.value = '';
			filterReactionMenu(input);
		}

		function filterReactionMenu(input) {
			const picker = input.closest('[data-chat-message-reactions]');
			const query = String(input.value || '').trim().toLowerCase();
			const forms = picker?.querySelectorAll('[data-chat-message-reaction-form]') || [];

			forms.forEach((form) => {
				const text = String(
					form.dataset.chatMessageReactionSearchText || '',
				).toLowerCase();

				form.hidden = Boolean(query) && !text.includes(query);
			});
		}

		function setReactionMoreIcon(button, isExpanded) {
			const icon = button.querySelector('i');
			if (!icon) return;

			icon.className = `bi ${isExpanded ? 'bi-dash-lg' : 'bi-plus-lg'}`;
		}

		function closeReactionMenus(exceptPicker = null) {
			messageSurface
				.querySelectorAll('[data-chat-message-reactions]')
				.forEach((picker) => {
					if (picker === exceptPicker) return;

					const menu = picker.querySelector('[data-chat-message-reaction-menu]');
					const extra = picker.querySelector('[data-chat-message-reaction-extra]');
					const toggle = picker.querySelector('[data-chat-message-reaction-toggle]');
					const more = picker.querySelector('[data-chat-message-reaction-more]');

					if (menu) menu.hidden = true;
					if (extra) extra.hidden = true;
					picker
						.querySelectorAll('[data-chat-message-reaction-form]')
						.forEach((form) => {
							form.hidden = false;
						});
					const search = picker.querySelector('[data-chat-message-reaction-search]');
					const searchInput = picker.querySelector(
						'[data-chat-message-reaction-search-input]',
					);
					const searchToggle = picker.querySelector(
						'[data-chat-message-reaction-search-toggle]',
					);
					if (search) search.hidden = true;
					if (searchInput) searchInput.value = '';
					toggle?.setAttribute('aria-expanded', 'false');
					more?.setAttribute('aria-expanded', 'false');
					searchToggle?.setAttribute('aria-expanded', 'false');
					if (more) setReactionMoreIcon(more, false);
				});
		}

		function handleReactionDetailsOver(event) {
			const item = event.target.closest('[data-chat-message-reaction-summary-item]');
			if (!item || !messageSurface.contains(item)) return;

			void showReactionDetails(item);
		}

		function handleReactionDetailsOut(event) {
			const item = event.target.closest('[data-chat-message-reaction-summary-item]');
			if (!item || item.contains(event.relatedTarget)) return;

			hideReactionDetails(item);
		}

		function handleReactionDetailsFocusIn(event) {
			const item = event.target.closest('[data-chat-message-reaction-summary-item]');
			if (!item) return;

			void showReactionDetails(item);
		}

		function handleReactionDetailsFocusOut(event) {
			const item = event.target.closest('[data-chat-message-reaction-summary-item]');
			if (!item || item.contains(event.relatedTarget)) return;

			hideReactionDetails(item);
		}

		async function showReactionDetails(item) {
			const popover = getOrCreateReactionDetailsPopover(item);
			popover.hidden = false;

			if (item.dataset.reactionDetailsLoaded === 'true') return;
			if (item.dataset.reactionDetailsLoading === 'true') return;

			item.dataset.reactionDetailsLoading = 'true';
			renderReactionDetailsLoading(popover);

			try {
				const details = await fetchReactionDetails(item);
				item.dataset.reactionDetailsLoaded = 'true';
				renderReactionDetails(popover, item, details.users || []);
			} catch (error) {
				console.error('Failed to load message reaction details', error);
				renderReactionDetailsError(popover);
			} finally {
				item.dataset.reactionDetailsLoading = 'false';
			}
		}

		function hideReactionDetails(item) {
			const popover = item.querySelector('[data-chat-message-reaction-details]');
			if (popover) popover.hidden = true;
		}

		async function fetchReactionDetails(item) {
			const url = chatPage.dataset.reactionDetailsUrl || '';
			const messageId = item.dataset.messageId || '';
			const reaction = item.dataset.reaction || '';
			if (!url || !messageId || !reaction) {
				throw new Error('Missing reaction details input');
			}

			const params = new URLSearchParams({ messageId, reaction });
			const response = await fetch(`${url}?${params.toString()}`, {
				headers: {
					Accept: 'application/json',
				},
				credentials: 'same-origin',
			});
			const payload = await response.json().catch(() => null);

			if (!response.ok || !payload?.ok) {
				throw new Error('Reaction details request failed');
			}

			return payload;
		}

		function getOrCreateReactionDetailsPopover(item) {
			let popover = item.querySelector('[data-chat-message-reaction-details]');
			if (popover) return popover;

			popover = document.createElement('span');
			popover.className = 'chat-message-reaction-details';
			popover.dataset.chatMessageReactionDetails = 'true';
			popover.hidden = true;
			item.appendChild(popover);

			return popover;
		}

		function renderReactionDetailsLoading(popover) {
			popover.textContent = '';
			const state = document.createElement('span');
			state.className = 'chat-message-reaction-details-state';
			state.textContent = chatPage.dataset.reactionLoadingLabel || '';
			popover.appendChild(state);
		}

		function renderReactionDetailsError(popover) {
			popover.textContent = '';
			const state = document.createElement('span');
			state.className = 'chat-message-reaction-details-state';
			state.textContent = chatPage.dataset.reactionErrorLabel || '';
			popover.appendChild(state);
		}

		function renderReactionDetails(popover, item, users) {
			popover.textContent = '';

			const title = document.createElement('span');
			title.className = 'chat-message-reaction-details-title';
			title.textContent = formatReactionDetailsCount(users.length);
			popover.appendChild(title);

			const list = document.createElement('span');
			list.className = 'chat-message-reaction-details-list';
			popover.appendChild(list);

			for (const user of users) {
				list.appendChild(createReactionDetailsUser(user, item));
			}
		}

		function createReactionDetailsUser(user, item) {
			const row = document.createElement('span');
			row.className = 'chat-message-reaction-details-user';

			const avatar = document.createElement('span');
			avatar.className = 'chat-message-reaction-details-avatar';
			avatar.style.backgroundColor = user.avatar?.background || '';
			avatar.setAttribute('aria-hidden', 'true');
			if (user.avatar?.src) {
				const image = document.createElement('img');
				image.src = user.avatar.src;
				image.alt = '';
				avatar.appendChild(image);
			} else {
				avatar.textContent = getReactionUserInitial(user);
			}

			const name = document.createElement('strong');
			name.textContent = user.isViewer
				? chatPage.dataset.reactionYouLabel || user.displayName || ''
				: user.displayName || '';

			const reaction = document.createElement('span');
			reaction.className = 'chat-message-reaction-details-emoji';
			reaction.textContent = item.dataset.reaction || '';

			row.append(avatar, name, reaction);
			return row;
		}

		function getReactionUserInitial(user) {
			return String(user.displayName || user.email || '?').slice(0, 1).toUpperCase();
		}

		function formatReactionDetailsCount(count) {
			if (count === 1) {
				return chatPage.dataset.reactionCountOneLabel || '1 reaction';
			}

			return String(chatPage.dataset.reactionCountTemplate || '{{count}} reactions')
				.replace('{{count}}', String(count));
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
			fillScrollableHistory,
			focusMessageById,
			handleMessageActionClick,
			handleMessageActionInput,
			handleMessageActionKeydown,
			handleMessageActionSubmit,
			handleReactionDetailsFocusIn,
			handleReactionDetailsFocusOut,
			handleReactionDetailsOut,
			handleReactionDetailsOver,
			loadOlderMessages,
			removeMessage,
			scheduleVisibleMessageMutationExpiries,
			scrollToLatestMessage,
			submitLiveMessage,
			updateMessage,
			clearReplyTarget,
		};
	}

	function parseQuickReactions(value) {
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
