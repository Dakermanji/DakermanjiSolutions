//! public/js/chat/conversation-page/messages-reactions.js

(() => {
	const {
		setFormControlsDisabled,
		showFlashMessage,
	} = window.ChatConversationUtils;

	function createReactionController({
		chatPage,
		extraReactions = [],
		messageRenderer,
		messageSurface,
		quickReactions = [],
	}) {
		async function handleActionClick(event) {
			const reactionSummaryItem = event.target.closest(
				'[data-chat-message-reaction-summary-item]',
			);
			if (
				reactionSummaryItem &&
				!event.target.closest('[data-chat-message-reaction-details]')
			) {
				await toggleSummaryReaction(reactionSummaryItem);
				return true;
			}

			const reactionToggle = event.target.closest(
				'[data-chat-message-reaction-toggle]',
			);
			if (reactionToggle) {
				toggleReactionMenu(reactionToggle);
				return true;
			}

			const reactionMore = event.target.closest(
				'[data-chat-message-reaction-more]',
			);
			if (reactionMore) {
				toggleExtraReactions(reactionMore);
				return true;
			}

			const reactionSearchToggle = event.target.closest(
				'[data-chat-message-reaction-search-toggle]',
			);
			if (reactionSearchToggle) {
				toggleReactionSearch(reactionSearchToggle);
				return true;
			}

			return false;
		}

		async function handleActionKeydown(event) {
			const reactionSummaryItem = event.target.closest(
				'[data-chat-message-reaction-summary-item]',
			);
			if (!reactionSummaryItem) return false;
			if (!['Enter', ' '].includes(event.key)) return false;

			event.preventDefault();
			await toggleSummaryReaction(reactionSummaryItem);
			return true;
		}

		async function handleActionSubmit(event) {
			const reactionForm = event.target.closest(
				'[data-chat-message-reaction-form]',
			);
			if (!reactionForm) return false;

			event.preventDefault();
			await submitMessageReaction(reactionForm);
			return true;
		}

		function handleActionInput(event) {
			const input = event.target.closest(
				'[data-chat-message-reaction-search-input]',
			);
			if (!input) return false;

			filterReactionMenu(input);
			return true;
		}

		function handleOutsideClick(event) {
			if (event.target.closest('[data-chat-message-reactions]')) return;

			closeReactionMenus();
		}

		async function submitMessageReaction(form) {
			const row = form.closest('[data-chat-message-id]');
			const button = form.querySelector('button[type="submit"]');
			if (!row || !button || button.disabled) return;

			const fields = new URLSearchParams(new FormData(form));
			setFormControlsDisabled(form, true);

			try {
				resetReactionTooltips(form.closest('[data-chat-message-reactions]'));
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
				hideReactionDetails(item);
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

		function resetReactionTooltips(scope) {
			scope
				?.querySelectorAll('.has-tooltip')
				.forEach((element) => window.AppTooltips?.reset(element));
			window.AppTooltips?.hideAll();
		}

		function updateLiveMessageReactions(payload) {
			if (
				!payload?.messageId ||
				payload.conversationId !== chatPage.dataset.activeConversationId
			) {
				return;
			}

			const row = findMessageReactionRow(payload.messageId);
			if (!row) return;

			const reactions = payload.viewerUserId === chatPage.dataset.currentUserId
				? payload.reactions || []
				: preserveViewerReactionState(row, payload.reactions || []);

			updateMessageReactions(row, reactions);
		}

		function findMessageReactionRow(messageId) {
			const escapedMessageId = window.CSS?.escape
				? CSS.escape(messageId)
				: String(messageId).replace(/"/g, '\\"');

			return messageSurface.querySelector(
				`[data-chat-message-id="${escapedMessageId}"]`,
			);
		}

		function preserveViewerReactionState(row, reactions) {
			const activeReactions = getViewerActiveReactions(row);

			return reactions.map((reaction) => ({
				...reaction,
				reactedByViewer: activeReactions.has(reaction.reaction),
			}));
		}

		function getViewerActiveReactions(row) {
			const activeReactions = new Set();

			row
				.querySelectorAll('[data-chat-message-reaction-summary-item].is-active')
				.forEach((item) => {
					if (item.dataset.reaction) {
						activeReactions.add(item.dataset.reaction);
					}
				});
			row
				.querySelectorAll('[data-chat-message-reaction-form] .is-active')
				.forEach((button) => {
					const reaction = button
						.closest('[data-chat-message-reaction-form]')
						?.elements.reaction?.value;
					if (reaction) {
						activeReactions.add(reaction);
					}
				});

			return activeReactions;
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

			popover.appendChild(createReactionDetailsTitle(item, users.length));

			const list = document.createElement('span');
			list.className = 'chat-message-reaction-details-list';
			popover.appendChild(list);

			for (const user of users) {
				list.appendChild(createReactionDetailsUser(user));
			}
		}

		function createReactionDetailsTitle(item, count) {
			const title = document.createElement('span');
			title.className = 'chat-message-reaction-details-title';

			const countText = document.createElement('span');
			countText.textContent = String(count);

			const reaction = document.createElement('span');
			reaction.setAttribute('aria-hidden', 'true');
			reaction.textContent = item.dataset.reaction || '';

			const label = document.createElement('span');
			label.textContent = item.dataset.reactionLabel || '';

			title.append(countText, reaction, label);
			return title;
		}

		function createReactionDetailsUser(user) {
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

			row.append(avatar, name);
			return row;
		}

		function getReactionUserInitial(user) {
			return String(user.displayName || user.email || '?').slice(0, 1).toUpperCase();
		}


		return {
			closeReactionMenus,
			handleActionClick,
			handleActionInput,
			handleActionKeydown,
			handleActionSubmit,
			handleOutsideClick,
			handleReactionDetailsFocusIn,
			handleReactionDetailsFocusOut,
			handleReactionDetailsOut,
			handleReactionDetailsOver,
			updateLiveMessageReactions,
			updateMessageReactions,
		};
	}

	window.ChatConversationMessageReactions = {
		createReactionController,
	};
})();

