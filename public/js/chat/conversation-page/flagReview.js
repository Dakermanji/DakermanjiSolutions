//! public/js/chat/conversation-page/flagReview.js

(() => {
	const {
		createPluralFormatter,
		escapeCssIdentifier,
		formatDateTime,
		getUserName,
		parseJsonScript,
		setFormControlsDisabled,
		showFlashMessage,
	} = window.ChatConversationUtils;

	const reviewItemTypes = Object.freeze({
		FLAGGED: 'flagged',
		PENDING_MODERATION: 'pending_moderation',
	});

	function createFlagReviewPanel({
		chatPage,
		list,
		state,
		count,
		messageSurface,
		setActiveSidePanel,
	}) {
		let isLoaded = false;
		let isLoading = false;
		const formatFlagCount = createPluralFormatter(
			parseJsonScript(
				document.querySelector('[data-chat-flag-count-labels]'),
			),
		);

		async function loadFlagReviewQueue({ force = false } = {}) {
			if (
				!list ||
				isLoading ||
				(isLoaded && !force)
			) {
				return;
			}

			isLoading = true;
			setFlagsState(chatPage.dataset.flagsLoadingLabel || '');

			const params = new URLSearchParams({
				conversationId: chatPage.dataset.activeConversationId,
			});

			try {
				const response = await fetch(
					`${chatPage.dataset.flagsUrl}?${params.toString()}`,
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
					throw new Error('Invalid review queue payload');
				}

				renderFlagReviewQueue(payload.messages);
			} catch (error) {
				console.error('Failed to load room review queue', error);
				setFlagsState(chatPage.dataset.flagsErrorLabel || '');
			} finally {
				isLoading = false;
			}
		}

		function renderFlagReviewQueue(messages) {
			list.replaceChildren(
				...messages.map((message) => createFlagReviewItem(message)),
			);
			isLoaded = true;

			if (count) {
				count.textContent = formatFlagCount(messages.length);
			}

			setFlagsState(
				messages.length > 0
					? ''
					: chatPage.dataset.flagsEmptyLabel || '',
			);
		}

		function createFlagReviewItem(message) {
			const item = document.createElement('li');
			item.className = `chat-flag-item ${getReviewItemClass(message)}`;
			item.dataset.chatFlagMessageId = message.id;
			item.dataset.chatReviewType = message.type || reviewItemTypes.FLAGGED;

			const avatar = document.createElement('span');
			avatar.className = 'chat-flag-avatar';
			avatar.setAttribute('aria-hidden', 'true');
			avatar.style.backgroundColor = message.sender?.avatar?.background || '';

			if (message.sender?.avatar?.src) {
				const image = document.createElement('img');
				image.src = message.sender.avatar.src;
				image.alt = '';
				avatar.appendChild(image);
			} else {
				avatar.textContent = getUserName(message.sender)
					.slice(0, 1)
					.toUpperCase();
			}

			const body = document.createElement('div');
			body.className = 'chat-flag-body';

			const title = document.createElement('div');
			title.className = 'chat-flag-title';

			const sender = document.createElement('strong');
			sender.textContent = getUserName(message.sender);
			title.append(sender);

			const reviewLabel = createReviewLabel(message);
			if (reviewLabel) {
				title.appendChild(reviewLabel);
			}

			const preview = document.createElement('p');
			preview.className = 'chat-flag-preview';
			preview.dir = 'auto';
			preview.textContent = message.preview || message.body || '';

			const reviewTime = document.createElement('time');
			reviewTime.className = 'chat-flag-time';
			reviewTime.dateTime = getReviewTime(message) || '';
			reviewTime.textContent = formatDateTime(getReviewTime(message));

			body.append(title, preview, reviewTime);

			const actions = document.createElement('div');
			actions.className = 'chat-flag-actions';

			const actionButtons = document.createElement('div');
			actionButtons.className = 'chat-flag-action-buttons';
			actionButtons.append(
				createFlagContextForm(message.id),
				...createReviewForms(message),
			);

			const meta = createReviewMeta(message);

			actions.append(actionButtons);
			if (meta) {
				actions.appendChild(meta);
			}
			window.AppTooltips?.initIn(actions);

			item.append(avatar, body, actions);

			return item;
		}

		function createReviewForms(message) {
			if (message.type === reviewItemTypes.PENDING_MODERATION) {
				return [
					createFlagReviewForm({
						action: chatPage.dataset.flagsHidePendingUrl,
						icon: 'bi-eye-slash',
						label: chatPage.dataset.flagsHidePendingLabel,
						messageId: message.id,
						isDanger: true,
					}),
					createFlagReviewForm({
						action: chatPage.dataset.flagsApprovePendingUrl,
						icon: 'bi-check2-circle',
						label: chatPage.dataset.flagsApprovePendingLabel,
						messageId: message.id,
					}),
				];
			}

			return [
				createFlagReviewForm({
					action: chatPage.dataset.flagsDeleteUrl,
					icon: 'bi-trash3',
					label: chatPage.dataset.flagsDeleteLabel,
					messageId: message.id,
					isDanger: true,
				}),
				createFlagReviewForm({
					action: chatPage.dataset.flagsSafeUrl,
					icon: 'bi-shield-check',
					label: chatPage.dataset.flagsSafeLabel,
					messageId: message.id,
				}),
			];
		}

		function createReviewLabel(message) {
			if (message.type !== reviewItemTypes.PENDING_MODERATION) return null;

			const label = document.createElement('span');
			label.className = 'chat-flag-review-label';
			label.textContent = chatPage.dataset.flagsPendingLabel || '';
			return label;
		}

		function createReviewMeta(message) {
			if (message.type === reviewItemTypes.PENDING_MODERATION) {
				const reason = document.createElement('span');
				reason.className = 'chat-flag-count';
				reason.textContent = formatModerationReason(message.moderationReason);
				return reason;
			}

			const flagCount = document.createElement('span');
			flagCount.className = 'chat-flag-count';
			flagCount.textContent = formatFlagCount(message.flagCount || 0);
			return flagCount;
		}

		function getReviewItemClass(message) {
			return message.type === reviewItemTypes.PENDING_MODERATION
				? 'is-pending-moderation'
				: 'is-flagged-message';
		}

		function getReviewTime(message) {
			return message.latestFlaggedAt || message.createdAt;
		}

		function formatModerationReason(reason) {
			if (reason === 'profanity') {
				return chatPage.dataset.flagsProfanityLabel || '';
			}

			return reason?.replaceAll('_', ' ') || '';
		}

		function createFlagContextForm(messageId) {
			const form = document.createElement('form');
			form.method = 'POST';
			form.action = chatPage.dataset.openMessageUrl || '';
			form.className = 'chat-flag-review-form';

			const conversationInput = document.createElement('input');
			conversationInput.type = 'hidden';
			conversationInput.name = 'conversationId';
			conversationInput.value = chatPage.dataset.activeConversationId;

			const messageInput = document.createElement('input');
			messageInput.type = 'hidden';
			messageInput.name = 'messageId';
			messageInput.value = messageId;

			const button = document.createElement('button');
			button.className = 'btn btn-action-outline chat-flag-action has-tooltip';
			button.type = 'submit';
			button.dataset.bsTitle = chatPage.dataset.flagsOpenContextLabel || '';
			button.setAttribute(
				'aria-label',
				chatPage.dataset.flagsOpenContextLabel || '',
			);
			button.innerHTML =
				'<i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>';

			form.append(conversationInput, messageInput, button);

			return form;
		}

		function createFlagReviewForm({
			action,
			icon,
			label,
			messageId,
			isDanger = false,
		}) {
			const form = document.createElement('form');
			form.method = 'POST';
			form.action = action || '';
			form.className = 'chat-flag-review-form';
			form.dataset.chatFlagReviewActionForm = 'true';

			if (isDanger) {
				form.dataset.chatFlagDeleteForm = 'true';
			}

			if (action === chatPage.dataset.flagsHidePendingUrl) {
				form.dataset.chatFlagHidePendingForm = 'true';
			}

			const conversationInput = document.createElement('input');
			conversationInput.type = 'hidden';
			conversationInput.name = 'conversationId';
			conversationInput.value = chatPage.dataset.activeConversationId;

			const messageInput = document.createElement('input');
			messageInput.type = 'hidden';
			messageInput.name = 'messageId';
			messageInput.value = messageId;

			const button = document.createElement('button');
			button.className =
				`btn btn-action-outline chat-flag-action has-tooltip${isDanger ? ' is-danger' : ''}`;
			button.type = 'submit';
			button.dataset.bsTitle = label || '';
			button.setAttribute('aria-label', label || '');
			button.innerHTML = `<i class="bi ${icon}" aria-hidden="true"></i>`;

			form.append(conversationInput, messageInput, button);

			return form;
		}

		function handleFlagReviewClick(event) {
			const openContextButton = event.target.closest(
				'[data-chat-flag-open-context]',
			);
			if (!openContextButton) return;

			const messageId = openContextButton.dataset.chatFlagOpenContext;
			const row = messageSurface.querySelector(
				`[data-chat-message-id="${escapeCssIdentifier(messageId)}"]`,
			);

			setActiveSidePanel(null);

			if (!row) {
				showFlashMessage(chatPage.dataset.flagsContextMissingLabel || '');
				return;
			}

			row.scrollIntoView({ block: 'center', behavior: 'smooth' });
			row.classList.add('is-context-focused');
			window.setTimeout(() => {
				row.classList.remove('is-context-focused');
			}, 2200);
		}

		async function handleFlagReviewSubmit(event) {
			const form = event.target.closest('[data-chat-flag-review-action-form]');
			if (!form) return;

			event.preventDefault();

			if (!confirmReviewAction(form)) return;

			await submitFlagReviewForm(form);
		}

		function confirmReviewAction(form) {
			if (form.matches('[data-chat-flag-hide-pending-form]')) {
				return window.confirm(
					chatPage.dataset.flagsHidePendingConfirm || '',
				);
			}

			if (form.matches('[data-chat-flag-delete-form]')) {
				return window.confirm(chatPage.dataset.flagsDeleteConfirm || '');
			}

			return true;
		}

		async function submitFlagReviewForm(form) {
			const item = form.closest('[data-chat-flag-message-id]');
			const fields = new URLSearchParams(new FormData(form));

			setFormControlsDisabled(item || form, true);

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

				if (payload?.ok || payload?.stale) {
					removeFlagReviewItem(item);
					return;
				}

				if (!response.ok || !payload?.ok) {
					throw new Error(
						payload?.reason || `Request failed with status ${response.status}`,
					);
				}
			} catch (error) {
				console.error('Failed to review room message', error);
				setFlagsState(chatPage.dataset.flagsErrorLabel || '');
			} finally {
				setFormControlsDisabled(item || form, false);
			}
		}

		function removeFlagReviewItem(item) {
			if (!item) return;

			item.remove();
			const remainingCount =
				list?.querySelectorAll('[data-chat-flag-message-id]').length || 0;

			if (count) {
				count.textContent = formatFlagCount(remainingCount);
			}

			setFlagsState(
				remainingCount > 0
					? ''
					: chatPage.dataset.flagsEmptyLabel || '',
			);
		}

		function setFlagsState(message) {
			if (!state) return;

			state.hidden = !message;
			const stateText = state.querySelector('p');
			if (stateText) {
				stateText.textContent = message;
			}
		}

		return {
			handleFlagReviewClick,
			handleFlagReviewSubmit,
			loadFlagReviewQueue,
		};
	}

	window.ChatConversationFlagReview = {
		createFlagReviewPanel,
	};
})();