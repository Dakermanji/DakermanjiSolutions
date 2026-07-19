//! public/js/chat/main.js

const friendsBody = document.querySelector(
	'[data-chat-section-body="friends"]',
);
const lazySections = document.querySelectorAll('[data-chat-section-collapse]');
const roomModal = document.getElementById('chatRoomModal');
const roomCreateButtons = document.querySelectorAll('[data-chat-room-visibility]');
const roomSearchForm = document.querySelector('[data-chat-room-search-form]');
const roomSearchResults = document.querySelector('[data-chat-room-search-results]');
const roomSearchTemplate = document.querySelector(
	'[data-chat-room-search-result-template]',
);

for (const sectionCollapse of lazySections) {
	const sectionId = sectionCollapse.dataset.chatSectionCollapse;
	const sectionBody = document.querySelector(
		`[data-chat-section-body="${CSS.escape(sectionId)}"]`,
	);

	if (!sectionBody) continue;

	sectionCollapse.addEventListener('show.bs.collapse', () => {
		void loadChatSection(sectionBody);
	});

	if (sectionCollapse.classList.contains('show')) {
		void loadChatSection(sectionBody);
	}
}

if (roomModal && roomCreateButtons.length > 0) {
	for (const button of roomCreateButtons) {
		button.addEventListener('click', () => {
			const visibility = button.dataset.chatRoomVisibility || '';
			const visibilityInput = roomModal.querySelector(
				`input[name="visibility"][value="${CSS.escape(visibility)}"]`,
			);

			if (visibilityInput) {
				visibilityInput.checked = true;
			}
		});
	}
}

if (roomSearchForm && roomSearchResults && roomSearchTemplate) {
	roomSearchForm.addEventListener('submit', (event) => {
		event.preventDefault();
		void searchRooms();
	});
}

async function loadChatSection(sectionBody, { force = false } = {}) {
	if (!sectionBody || (!force && sectionBody.dataset.loaded === 'true')) {
		return;
	}

	renderLoadingState(sectionBody);

	try {
		const response = await fetch(sectionBody.dataset.url, {
			headers: {
				Accept: 'application/json',
			},
			credentials: 'same-origin',
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();
		const sectionId = sectionBody.dataset.chatSectionBody;

		if (!payload?.ok) {
			throw new Error('Invalid chat section payload');
		}

		sectionBody.dataset.loaded = 'true';

		if (sectionId === 'friends') {
			if (!Array.isArray(payload.conversations)) {
				throw new Error('Invalid friend chats payload');
			}

			updateSectionCount(sectionId, payload.conversations.length);
			renderFriendChats(payload.conversations);
			return;
		}

		if (!Array.isArray(payload.rooms)) {
			throw new Error('Invalid room chats payload');
		}

		if (
			sectionId === 'privateRooms' &&
			payload.pendingRequests &&
			!Array.isArray(payload.pendingRequests)
		) {
			throw new Error('Invalid pending room requests payload');
		}

		updateSectionCount(sectionId, payload.rooms.length);
		renderRooms(sectionBody, payload.rooms, payload.pendingRequests || []);
	} catch (error) {
		console.error('Failed to load chat section', error);
		renderMessage(sectionBody, sectionBody.dataset.errorLabel);
	}
}

async function searchRooms() {
	const queryInput = roomSearchForm.querySelector('input[name="query"]');
	const query = queryInput?.value?.trim() || '';

	if (!query) {
		renderRoomSearchEmpty(roomSearchForm.dataset.emptyLabel);
		return;
	}

	renderRoomSearchLoading();

	try {
		const url = new URL(roomSearchForm.dataset.url, window.location.origin);
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
		renderRoomSearchEmpty(roomSearchForm.dataset.errorLabel, 'bi-exclamation-triangle');
	}
}

function renderRoomSearchResults(rooms) {
	roomSearchResults.replaceChildren();

	if (rooms.length === 0) {
		renderRoomSearchEmpty(roomSearchForm.dataset.emptyLabel);
		return;
	}

	for (const item of rooms) {
		roomSearchResults.appendChild(createRoomSearchResult(item));
	}
}

function createRoomSearchResult(item) {
	const room = item.room || {};
	const owner = item.owner || {};
	const ownerName = owner.displayName || owner.username || owner.email || '';
	const fragment = roomSearchTemplate.content.cloneNode(true);
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
		? (roomSearchForm.dataset.ownerLabel || '').replace('{{owner}}', ownerName)
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
				roomSearchForm.dataset.openUrl || '/chat/rooms/open',
			);
		});
		return;
	}

	if (action === 'join') {
		button.addEventListener('click', () => {
			submitRoomActionForm(
				room.conversationId,
				roomSearchForm.dataset.joinUrl || '/chat/rooms/join',
			);
		});
		return;
	}

	if (action === 'request') {
		button.addEventListener('click', () => {
			submitRoomActionForm(
				room.conversationId,
				roomSearchForm.dataset.requestUrl || '/chat/rooms/request',
			);
		});
		return;
	}

	button.classList.add('is-disabled');
	button.setAttribute('aria-disabled', 'true');
}

function submitRoomActionForm(conversationId, actionUrl) {
	if (!conversationId) return;

	const form = document.createElement('form');
	form.method = 'POST';
	form.action = actionUrl;
	form.hidden = true;

	const input = document.createElement('input');
	input.type = 'hidden';
	input.name = 'conversationId';
	input.value = conversationId;

	form.appendChild(input);
	document.body.appendChild(form);
	form.submit();
}

function getRoomSearchActionLabel(action) {
	if (action === 'join') return roomSearchForm.dataset.joinLabel || '';
	if (action === 'request') return roomSearchForm.dataset.requestLabel || '';
	if (action === 'pending') return roomSearchForm.dataset.pendingLabel || '';
	return roomSearchForm.dataset.openLabel || '';
}

function getRoomSearchActionIcon(action) {
	if (action === 'join') return 'bi-plus-lg';
	if (action === 'request') return 'bi-person-plus-fill';
	if (action === 'pending') return 'bi-hourglass-split';
	return 'bi-box-arrow-in-right';
}

function renderFriendChats(conversations) {
	friendsBody.replaceChildren();

	if (conversations.length === 0) {
		renderEmptyState(
			friendsBody,
			'bi-person-hearts',
			friendsBody.dataset.emptyLabel,
		);
		return;
	}

	const list = document.createElement('div');
	list.className = 'chat-friend-list';

	for (const conversation of conversations) {
		list.appendChild(createFriendChatItem(conversation));
	}

	friendsBody.appendChild(list);
}

function renderRooms(sectionBody, rooms, pendingRequests = []) {
	sectionBody.replaceChildren();

	if (rooms.length === 0 && pendingRequests.length === 0) {
		renderEmptyState(
			sectionBody,
			sectionBody.dataset.iconClass,
			sectionBody.dataset.emptyLabel,
		);
		return;
	}

	if (rooms.length > 0) {
		sectionBody.appendChild(createRoomList(rooms, sectionBody));
	}

	if (pendingRequests.length > 0) {
		sectionBody.appendChild(createPendingRequestList(pendingRequests, sectionBody));
	}
}

function createRoomList(rooms, sectionBody) {
	const list = document.createElement('div');
	list.className = 'chat-friend-list';

	for (const item of rooms) {
		list.appendChild(createRoomItem(item, sectionBody));
	}

	return list;
}

function createPendingRequestList(requests, sectionBody) {
	const wrapper = document.createElement('div');
	wrapper.className = 'chat-room-pending-group';

	const title = document.createElement('h3');
	title.className = 'chat-room-pending-title';
	title.textContent = sectionBody.dataset.pendingRequestsTitle || '';

	const list = document.createElement('div');
	list.className = 'chat-friend-list';

	for (const item of requests) {
		list.appendChild(createPendingRoomRequestItem(item, sectionBody));
	}

	wrapper.append(title, list);
	return wrapper;
}

function createPendingRoomRequestItem(item, sectionBody) {
	const room = item.room || {};
	const owner = item.owner || {};
	const roomName = room.title || '';
	const ownerName = owner.displayName || owner.username || owner.email || '';

	const card = document.createElement('div');
	card.className = 'chat-friend-item chat-request-item';

	const avatar = document.createElement('span');
	avatar.className = 'chat-friend-avatar';
	avatar.textContent = roomName.slice(0, 1).toUpperCase();

	const content = document.createElement('span');
	content.className = 'chat-friend-content';

	const title = document.createElement('span');
	title.className = 'chat-friend-name';
	title.textContent = roomName;

	const meta = document.createElement('span');
	meta.className = 'chat-friend-meta';
	meta.textContent = ownerName;

	content.append(title, meta);

	const spacer = document.createElement('span');
	spacer.className = 'chat-unread-spacer';
	spacer.setAttribute('aria-hidden', 'true');

	const status = document.createElement('span');
	status.className = 'chat-request-status has-tooltip';
	status.setAttribute(
		'aria-label',
		sectionBody.dataset.pendingRequestLabel || '',
	);
	status.setAttribute(
		'data-bs-title',
		sectionBody.dataset.pendingRequestLabel || '',
	);

	const icon = document.createElement('i');
	icon.className = 'bi bi-hourglass-split';
	icon.setAttribute('aria-hidden', 'true');
	status.appendChild(icon);

	card.append(avatar, content, spacer, status);
	window.AppTooltips?.initIn(card);

	return card;
}

function createRoomItem(item, sectionBody) {
	const room = item.room || {};
	const owner = item.owner || {};
	const roomName = room.title || '';
	const ownerName = owner.displayName || owner.username || owner.email || '';

	const form = document.createElement('form');
	form.className = 'chat-friend-form';
	form.method = 'POST';
	form.action = sectionBody.dataset.openUrl || '/chat/rooms/open';

	const input = document.createElement('input');
	input.type = 'hidden';
	input.name = 'conversationId';
	input.value = room.conversationId || '';

	const button = document.createElement('button');
	button.type = 'submit';
	button.className = 'chat-friend-item';
	button.dataset.conversationId = room.conversationId || '';
	button.setAttribute('aria-label', `${sectionBody.dataset.openLabel}: ${roomName}`);

	const avatar = document.createElement('span');
	avatar.className = 'chat-friend-avatar';
	avatar.textContent = roomName.slice(0, 1).toUpperCase();

	const content = document.createElement('span');
	content.className = 'chat-friend-content';

	const title = document.createElement('span');
	title.className = 'chat-friend-name';
	title.textContent = roomName;

	const meta = document.createElement('span');
	meta.className = 'chat-friend-meta';
	meta.textContent = ownerName;

	content.append(title, meta);

	const unreadBadge = createUnreadBadge(
		room.unreadCount,
		sectionBody.dataset.unreadLabel,
	);

	const icon = document.createElement('i');
	icon.className = 'bi bi-chevron-right chat-friend-open';
	icon.setAttribute('aria-hidden', 'true');

	button.append(avatar, content, unreadBadge, icon);
	form.append(input, button);

	return form;
}

function createFriendChatItem(item) {
	const friend = item.friend || {};
	const conversation = item.conversation || {};
	const friendName =
		friend.username ||
		friend.email ||
		friendsBody.dataset.friendFallbackLabel ||
		'Friend';

	const form = document.createElement('form');
	form.className = 'chat-friend-form';
	form.method = 'POST';
	form.action = friendsBody.dataset.openUrl || '/chat/friends/open';

	const input = document.createElement('input');
	input.type = 'hidden';
	input.name = 'conversationId';
	input.value = conversation.id || '';

	const button = document.createElement('button');
	button.type = 'submit';
	button.className = 'chat-friend-item';
	button.dataset.conversationId = conversation.id || '';
	button.setAttribute('aria-label', `${friendsBody.dataset.openLabel}: ${friendName}`);

	const avatar = document.createElement('span');
	avatar.className = 'chat-friend-avatar';
	avatar.style.backgroundColor = friend.avatar?.background || '';

	if (friend.avatar?.src) {
		const image = document.createElement('img');
		image.src = friend.avatar.src;
		image.alt = '';
		avatar.appendChild(image);
	} else {
		avatar.textContent = friendName.slice(0, 1).toUpperCase();
	}

	const content = document.createElement('span');
	content.className = 'chat-friend-content';

	const title = document.createElement('span');
	title.className = 'chat-friend-name';
	title.textContent = friendName;

	const meta = document.createElement('span');
	meta.className = 'chat-friend-meta';
	meta.textContent = friendsBody.dataset.openLabel;

	content.append(title, meta);

	const unreadBadge = createUnreadBadge(
		conversation.unreadCount,
		friendsBody.dataset.unreadLabel,
	);

	const icon = document.createElement('i');
	icon.className = 'bi bi-chevron-right chat-friend-open';
	icon.setAttribute('aria-hidden', 'true');

	button.append(avatar, content, unreadBadge, icon);

	form.append(input, button);

	return form;
}

function createUnreadBadge(count, unreadLabel) {
	const unreadCount = Number(count || 0);
	const unreadBadge = document.createElement('span');

	if (unreadCount <= 0) {
		unreadBadge.className = 'chat-unread-spacer';
		unreadBadge.setAttribute('aria-hidden', 'true');
		return unreadBadge;
	}

	unreadBadge.className = 'chat-unread-badge';
	unreadBadge.textContent = new Intl.NumberFormat(
		document.documentElement.lang || 'en',
	).format(unreadCount);
	unreadBadge.setAttribute(
		'aria-label',
		(unreadLabel || '').replace(
			'{{count}}',
			unreadBadge.textContent,
		),
	);

	return unreadBadge;
}

function updateSectionCount(sectionId, count) {
	const countElement = document.querySelector(
		`[data-chat-count-section="${CSS.escape(sectionId)}"]`,
	);

	if (!countElement) return;

	countElement.textContent = new Intl.NumberFormat(
		document.documentElement.lang || 'en',
	).format(count);
}

function renderEmptyState(sectionBody, iconClass, message) {
	sectionBody.replaceChildren();

	const wrapper = document.createElement('div');
	wrapper.className = 'chat-empty-state';

	const icon = document.createElement('i');
	icon.className = `bi ${iconClass}`;
	icon.setAttribute('aria-hidden', 'true');

	const text = document.createElement('p');
	text.textContent = message || '';

	wrapper.append(icon, text);
	sectionBody.appendChild(wrapper);
}

function renderMessage(sectionBody, message) {
	sectionBody.replaceChildren();

	const paragraph = document.createElement('p');
	paragraph.className = 'text-body-secondary mb-0';
	paragraph.textContent = message || '';

	sectionBody.appendChild(paragraph);
}

function renderLoadingState(sectionBody) {
	sectionBody.replaceChildren();

	const wrapper = document.createElement('div');
	wrapper.className = 'd-flex align-items-center justify-content-center py-3';

	const spinner = document.createElement('div');
	spinner.className = 'spinner-border spinner-border-sm text-primary';
	spinner.setAttribute('role', 'status');

	const label = document.createElement('span');
	label.className = 'visually-hidden';
	label.textContent = sectionBody.dataset.loadingLabel || 'Loading';

	spinner.appendChild(label);
	wrapper.appendChild(spinner);
	sectionBody.appendChild(wrapper);
}

function renderRoomSearchLoading() {
	roomSearchResults.replaceChildren();

	const wrapper = document.createElement('div');
	wrapper.className = 'chat-room-search-empty';

	const spinner = document.createElement('div');
	spinner.className = 'spinner-border spinner-border-sm text-primary';
	spinner.setAttribute('role', 'status');

	const label = document.createElement('span');
	label.className = 'visually-hidden';
	label.textContent = roomSearchForm.dataset.loadingLabel || 'Loading';

	spinner.appendChild(label);
	wrapper.appendChild(spinner);
	roomSearchResults.appendChild(wrapper);
}

function renderRoomSearchEmpty(message, iconClass = 'bi-search') {
	roomSearchResults.replaceChildren();

	const wrapper = document.createElement('div');
	wrapper.className = 'chat-room-search-empty';

	const icon = document.createElement('i');
	icon.className = `bi ${iconClass}`;
	icon.setAttribute('aria-hidden', 'true');

	const text = document.createElement('p');
	text.textContent = message || '';

	wrapper.append(icon, text);
	roomSearchResults.appendChild(wrapper);
}
