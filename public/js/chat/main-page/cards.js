//! public/js/chat/main-page/cards.js

(() => {
	const { createUnreadBadge } = window.ChatMainBadges;
	const { renderEmptyState } = window.ChatMainUtils;

	function renderFriendChats(sectionBody, conversations) {
		sectionBody.replaceChildren();

		if (conversations.length === 0) {
			renderEmptyState(
				sectionBody,
				'bi-person-hearts',
				sectionBody.dataset.emptyLabel,
			);
			return;
		}

		const list = document.createElement('div');
		list.className = 'chat-friend-list';

		for (const conversation of conversations) {
			list.appendChild(createFriendChatItem(sectionBody, conversation));
		}

		sectionBody.appendChild(list);
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
			sectionBody.appendChild(createRoomList(sectionBody, rooms));
		}

		if (pendingRequests.length > 0) {
			sectionBody.appendChild(
				createPendingRequestList(sectionBody, pendingRequests),
			);
		}
	}

	function createRoomList(sectionBody, rooms) {
		const list = document.createElement('div');
		list.className = 'chat-friend-list';

		for (const item of rooms) {
			list.appendChild(createRoomItem(sectionBody, item));
		}

		return list;
	}

	function createPendingRequestList(sectionBody, requests) {
		const wrapper = document.createElement('div');
		wrapper.className = 'chat-room-pending-group';

		const title = document.createElement('h3');
		title.className = 'chat-room-pending-title';
		title.textContent = sectionBody.dataset.pendingRequestsTitle || '';

		const list = document.createElement('div');
		list.className = 'chat-friend-list';

		for (const item of requests) {
			list.appendChild(createPendingRoomRequestItem(sectionBody, item));
		}

		wrapper.append(title, list);
		return wrapper;
	}

	function createPendingRoomRequestItem(sectionBody, item) {
		const request = item.request || {};
		const room = item.room || {};
		const owner = item.owner || {};
		const roomName = room.title || '';
		const ownerName = owner.displayName || owner.username || owner.email || '';

		const form = document.createElement('form');
		form.className = 'chat-friend-form';
		form.method = 'POST';
		form.action =
			sectionBody.dataset.cancelRequestUrl || '/chat/rooms/request/cancel';

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'requestId';
		input.value = request.id || '';

		const card = document.createElement('span');
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

		const cancelButton = document.createElement('button');
		cancelButton.type = 'submit';
		cancelButton.className =
			'btn btn-action-outline chat-request-cancel has-tooltip';
		cancelButton.setAttribute(
			'aria-label',
			sectionBody.dataset.cancelRequestLabel || '',
		);
		cancelButton.setAttribute(
			'data-bs-title',
			sectionBody.dataset.cancelRequestLabel || '',
		);

		const cancelIcon = document.createElement('i');
		cancelIcon.className = 'bi bi-x-lg';
		cancelIcon.setAttribute('aria-hidden', 'true');
		cancelButton.appendChild(cancelIcon);

		card.append(avatar, content, spacer, status, cancelButton);
		form.append(input, card);
		window.AppTooltips?.initIn(form);

		return form;
	}

	function createRoomItem(sectionBody, item) {
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
		button.setAttribute(
			'aria-label',
			`${sectionBody.dataset.openLabel}: ${roomName}`,
		);

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

	function createFriendChatItem(sectionBody, item) {
		const friend = item.friend || {};
		const conversation = item.conversation || {};
		const friendName =
			friend.username ||
			friend.email ||
			sectionBody.dataset.friendFallbackLabel ||
			'Friend';

		const form = document.createElement('form');
		form.className = 'chat-friend-form';
		form.method = 'POST';
		form.action = sectionBody.dataset.openUrl || '/chat/friends/open';

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'conversationId';
		input.value = conversation.id || '';

		const button = document.createElement('button');
		button.type = 'submit';
		button.className = 'chat-friend-item';
		button.dataset.conversationId = conversation.id || '';
		button.setAttribute(
			'aria-label',
			`${sectionBody.dataset.openLabel}: ${friendName}`,
		);

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
		meta.textContent = sectionBody.dataset.openLabel;

		content.append(title, meta);

		const unreadBadge = createUnreadBadge(
			conversation.unreadCount,
			sectionBody.dataset.unreadLabel,
		);

		const icon = document.createElement('i');
		icon.className = 'bi bi-chevron-right chat-friend-open';
		icon.setAttribute('aria-hidden', 'true');

		button.append(avatar, content, unreadBadge, icon);

		form.append(input, button);

		return form;
	}

	window.ChatMainCards = {
		renderFriendChats,
		renderRooms,
	};
})();
