//! public/js/chat/main-page/roomSearch.js

(() => {
	const {
		submitRoomActionForm,
	} = window.ChatMainUtils;

	function createRoomSearchController({ form, results, template }) {
		function init() {
			if (!form || !results || !template) return;

			form.addEventListener('submit', (event) => {
				event.preventDefault();
				void searchRooms();
			});
		}

		async function searchRooms() {
			const queryInput = form.querySelector('input[name="query"]');
			const query = queryInput?.value?.trim() || '';

			if (!query) {
				renderRoomSearchEmpty(form.dataset.emptyLabel);
				return;
			}

			renderRoomSearchLoading();

			try {
				const url = new URL(form.dataset.url, window.location.origin);
				url.searchParams.set('q', query);

				const response = await fetch(url, {
					headers: {
						Accept: 'application/json',
					},
					credentials: 'same-origin',
				});

				if (!response.ok) {
					throw new Error(`Request failed with status ${response.status}`);
				}

				const payload = await response.json();

				if (!payload?.ok || !Array.isArray(payload.rooms)) {
					throw new Error('Invalid room search payload');
				}

				renderRoomSearchResults(payload.rooms);
			} catch (error) {
				console.error('Failed to search rooms', error);
				renderRoomSearchEmpty(
					form.dataset.errorLabel,
					'bi-exclamation-triangle',
				);
			}
		}

		function renderRoomSearchResults(rooms) {
			results.replaceChildren();

			if (rooms.length === 0) {
				renderRoomSearchEmpty(form.dataset.emptyLabel);
				return;
			}

			for (const item of rooms) {
				results.appendChild(createRoomSearchResult(item));
			}
		}

		function createRoomSearchResult(item) {
			const room = item.room || {};
			const owner = item.owner || {};
			const ownerName = owner.displayName || owner.username || owner.email || '';
			const fragment = template.content.cloneNode(true);
			const result = fragment.querySelector('.chat-room-search-result');
			const typeIcon = fragment.querySelector('[data-room-type-icon]');
			const title = fragment.querySelector('[data-room-title]');
			const description = fragment.querySelector('[data-room-description]');
			const keywords = fragment.querySelector('[data-room-keywords]');
			const ownerLabel = fragment.querySelector('[data-room-owner]');
			const actionButton = fragment.querySelector('[data-room-action]');

			typeIcon.appendChild(createRoomSearchTypeIcon(room));
			title.textContent = room.title || '';
			description.textContent = room.description || '';
			renderRoomKeywords(keywords, room.keywords);
			ownerLabel.textContent = ownerName
				? (form.dataset.ownerLabel || '').replace('{{owner}}', ownerName)
				: '';

			setupRoomSearchAction(actionButton, room);
			window.AppTooltips?.initIn(result);

			return result;
		}

		function renderRoomKeywords(container, keywords) {
			if (!container || !Array.isArray(keywords) || keywords.length === 0) {
				return;
			}

			for (const keyword of keywords) {
				const tag = document.createElement('span');
				tag.className = 'chat-room-search-keyword';
				tag.textContent = keyword;
				container.appendChild(tag);
			}
		}

		function createRoomSearchTypeIcon(room) {
			const icon = document.createElement('i');
			const isPublicRoom = room.visibility === 'public';

			if (isPublicRoom) {
				icon.className = 'bi bi-megaphone-fill';
			} else if (room.isMember) {
				icon.className = 'bi bi-unlock-fill';
			} else {
				icon.className = 'bi bi-lock-fill';
			}

			icon.setAttribute('aria-hidden', 'true');
			return icon;
		}

		function setupRoomSearchAction(button, room) {
			const action = room.action || '';
			const label = getRoomSearchActionLabel(action);
			const icon = document.createElement('i');

			button.textContent = '';
			button.setAttribute('data-bs-title', label);
			button.setAttribute('aria-label', label);
			icon.className = `bi ${getRoomSearchActionIcon(action)}`;
			icon.setAttribute('aria-hidden', 'true');
			button.appendChild(icon);

			if (action === 'open') {
				button.addEventListener('click', () => {
					submitRoomActionForm(
						room.conversationId,
						form.dataset.openUrl || '/chat/rooms/open',
					);
				});
				return;
			}

			if (action === 'join') {
				button.addEventListener('click', () => {
					submitRoomActionForm(
						room.conversationId,
						form.dataset.joinUrl || '/chat/rooms/join',
					);
				});
				return;
			}

			if (action === 'request') {
				button.addEventListener('click', () => {
					submitRoomActionForm(
						room.conversationId,
						form.dataset.requestUrl || '/chat/rooms/request',
					);
				});
				return;
			}

			button.classList.add('is-disabled');
			button.setAttribute('aria-disabled', 'true');
		}

		function getRoomSearchActionLabel(action) {
			if (action === 'join') return form.dataset.joinLabel || '';
			if (action === 'request') return form.dataset.requestLabel || '';
			if (action === 'pending') return form.dataset.pendingLabel || '';
			return form.dataset.openLabel || '';
		}

		function getRoomSearchActionIcon(action) {
			if (action === 'join') return 'bi-plus-lg';
			if (action === 'request') return 'bi-person-plus-fill';
			if (action === 'pending') return 'bi-hourglass-split';
			return 'bi-box-arrow-in-right';
		}

		function renderRoomSearchLoading() {
			results.replaceChildren();

			const wrapper = document.createElement('div');
			wrapper.className = 'chat-room-search-empty';

			const spinner = document.createElement('div');
			spinner.className = 'spinner-border spinner-border-sm text-primary';
			spinner.setAttribute('role', 'status');

			const label = document.createElement('span');
			label.className = 'visually-hidden';
			label.textContent = form.dataset.loadingLabel || 'Loading';

			spinner.appendChild(label);
			wrapper.appendChild(spinner);
			results.appendChild(wrapper);
		}

		function renderRoomSearchEmpty(message, iconClass = 'bi-search') {
			results.replaceChildren();

			const wrapper = document.createElement('div');
			wrapper.className = 'chat-room-search-empty';

			const icon = document.createElement('i');
			icon.className = `bi ${iconClass}`;
			icon.setAttribute('aria-hidden', 'true');

			const text = document.createElement('p');
			text.textContent = message || '';

			wrapper.append(icon, text);
			results.appendChild(wrapper);
		}

		return { init };
	}

	window.ChatMainRoomSearch = {
		createRoomSearchController,
	};
})();
