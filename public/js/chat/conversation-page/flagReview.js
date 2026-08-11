//! public/js/chat/conversation-page/flagReview.js

(() => {
	const {
		createPluralFormatter,
		escapeCssIdentifier,
		formatCountLabel,
		formatDateTime,
		getUserName,
		parseJsonScript,
		setFormControlsDisabled,
	} = window.ChatConversationUtils;

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
					throw new Error('Invalid flagged messages payload');
				}

				renderFlagReviewQueue(payload.messages);
			} catch (error) {
				console.error('Failed to load flagged room messages', error);
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
			item.className = 'chat-flag-item';
			item.dataset.chatFlagMessageId = message.id;

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

			const preview = document.createElement('p');
			preview.className = 'chat-flag-preview';
			preview.dir = 'auto';
			preview.textContent = message.preview || message.body || '';

			const latestFlag = document.createElement('time');
			latestFlag.className = 'chat-flag-time';
			latestFlag.dateTime = message.latestFlaggedAt || '';
			latestFlag.textContent = formatDateTime(message.latestFlaggedAt);

			body.append(title, preview, latestFlag);

			const actions = document.createElement('div');
			actions.className = 'chat-flag-actions';

			const actionButtons = document.createElement('div');
			actionButtons.className = 'chat-flag-action-buttons';
			actionButtons.append(
				createFlagContextForm(message.id),
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
			);

			const flagCount = document.createElement('span');
			flagCount.className = 'chat-flag-count';
			flagCount.textContent = formatFlagCount(message.flagCount || 0);

			actions.append(
				actionButtons,
				flagCount,
			);
			window.AppTooltips?.initIn(actions);

			item.append(avatar, body, actions);

			return item;
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
				window.alert(chatPage.dataset.flagsContextMissingLabel || '');
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

			const isDeleteForm = form.matches('[data-chat-flag-delete-form]');
			if (isDeleteForm) {
				const confirmed = window.confirm(
					chatPage.dataset.flagsDeleteConfirm || '',
				);
				if (!confirmed) return;
			}

			await submitFlagReviewForm(form);
		}

		async function submitFlagReviewForm(form) {
			const item = form.closest('[data-chat-flag-message-id]');
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
					throw new Error(
						payload?.reason || `Request failed with status ${response.status}`,
					);
				}

				removeFlagReviewItem(item);
			} catch (error) {
				console.error('Failed to review flagged room message', error);
				setFlagsState(chatPage.dataset.flagsErrorLabel || '');
			} finally {
				setFormControlsDisabled(form, false);
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
