//! public/js/chat/main.js

const friendsCollapse = document.querySelector(
	'[data-chat-section-collapse="friends"]',
);
const friendsBody = document.querySelector(
	'[data-chat-section-body="friends"]',
);
const friendsCount = document.querySelector(
	'[data-chat-count-section="friends"]',
);
const roomModal = document.getElementById('chatRoomModal');
const roomCreateButtons = document.querySelectorAll('[data-chat-room-visibility]');

if (friendsCollapse && friendsBody) {
	friendsCollapse.addEventListener('show.bs.collapse', () => {
		void loadFriendChats();
	});

	if (friendsCollapse.classList.contains('show')) {
		void loadFriendChats();
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

async function loadFriendChats({ force = false } = {}) {
	if (!friendsBody || (!force && friendsBody.dataset.loaded === 'true')) {
		return;
	}

	renderLoadingState(friendsBody);

	try {
		const response = await fetch(friendsBody.dataset.url, {
			headers: {
				Accept: 'application/json',
			},
			credentials: 'same-origin',
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();

		if (!payload?.ok || !Array.isArray(payload.conversations)) {
			throw new Error('Invalid friend chats payload');
		}

		friendsBody.dataset.loaded = 'true';
		updateFriendsCount(payload.conversations.length);
		renderFriendChats(payload.conversations);
	} catch (error) {
		console.error('Failed to load friend chats', error);
		renderMessage(friendsBody, friendsBody.dataset.errorLabel);
	}
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

	const unreadCount = Number(conversation.unreadCount || 0);
	const unreadBadge = document.createElement('span');

	if (unreadCount > 0) {
		unreadBadge.className = 'chat-unread-badge';
		unreadBadge.textContent = new Intl.NumberFormat(
			document.documentElement.lang || 'en',
		).format(unreadCount);
		unreadBadge.setAttribute(
			'aria-label',
			(friendsBody.dataset.unreadLabel || '').replace(
				'{{count}}',
				unreadBadge.textContent,
			),
		);
	} else {
		unreadBadge.className = 'chat-unread-spacer';
		unreadBadge.setAttribute('aria-hidden', 'true');
	}

	const icon = document.createElement('i');
	icon.className = 'bi bi-chevron-right chat-friend-open';
	icon.setAttribute('aria-hidden', 'true');

	button.append(avatar, content, unreadBadge, icon);

	form.append(input, button);

	return form;
}

function updateFriendsCount(count) {
	if (!friendsCount) return;

	friendsCount.textContent = new Intl.NumberFormat(
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
