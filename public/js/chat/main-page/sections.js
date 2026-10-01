//! public/js/chat/main-page/sections.js

(() => {
	const {
		getSectionBody,
		renderLoadingState,
		renderMessage,
		sumUnreadCounts,
	} = window.ChatMainUtils;
	const {
		updateConversationUnreadCount,
		updateSectionCount,
		updateSectionUnreadCount,
		updateSectionUnreadCountsFromPayload,
	} = window.ChatMainBadges;
	const { renderFriendChats, renderRooms } = window.ChatMainCards;

	function createChatSectionsController({ lazySections }) {
		let refreshTimeout = null;
		let friendPresenceSocket = null;
		let friendSectionCollapse = null;
		let friendSectionBody = null;

		function friendsVisible() {
			return document.visibilityState === 'visible'
				&& friendSectionCollapse?.classList.contains('show');
		}

		function updateFriendPresence(userId, status) {
			if (!friendsVisible()) return;
			const labels = JSON.parse(friendSectionBody.dataset.presenceLabels || '{}');
			for (const dot of friendSectionBody.querySelectorAll('[data-chat-friend-presence]')) {
				if (dot.dataset.chatFriendPresence !== userId) continue;
				const resolved = Object.hasOwn(labels, status) ? status : 'offline';
				dot.dataset.status = resolved;
				dot.dataset.bsTitle = labels[resolved];
				dot.setAttribute('aria-label', labels[resolved]);
				window.bootstrap?.Tooltip.getInstance(dot)?.setContent({ '.tooltip-inner': labels[resolved] });
			}
		}

		function watchFriends() {
			if (!friendPresenceSocket?.connected || !friendsVisible()) return;
			friendPresenceSocket.emit('presence:watch', { scope: 'chat-friends' }, (result) => {
				if (!result?.ok || !friendsVisible()) return;
				for (const item of result.statuses || []) updateFriendPresence(item.userId, item.status);
			});
		}

		function unwatchFriends() {
			friendPresenceSocket?.emit('presence:unwatch');
		}

		function init() {
			if (typeof window.io === 'function') {
				friendPresenceSocket = window.io({ withCredentials: true });
				friendPresenceSocket.on('connect', watchFriends);
				friendPresenceSocket.on('presence:peer:changed', (payload) => updateFriendPresence(payload?.userId, payload?.status));
			}
			for (const sectionCollapse of lazySections) {
				const sectionId = sectionCollapse.dataset.chatSectionCollapse;
				const sectionBody = getSectionBody(sectionId);

				if (!sectionBody) continue;
				if (sectionId === 'friends') {
					friendSectionCollapse = sectionCollapse;
					friendSectionBody = sectionBody;
					sectionCollapse.addEventListener('shown.bs.collapse', () => {
						void loadChatSection(sectionBody, { force: true, onlyVisible: true });
					});
					sectionCollapse.addEventListener('hide.bs.collapse', unwatchFriends);
				}

				sectionCollapse.addEventListener('show.bs.collapse', () => {
					if (sectionId !== 'friends') void loadChatSection(sectionBody);
				});

				if (sectionCollapse.classList.contains('show')) {
					void loadChatSection(sectionBody);
					if (sectionId === 'friends') watchFriends();
				}
			}
			document.addEventListener('visibilitychange', () => {
				if (friendsVisible()) void loadChatSection(friendSectionBody, { force: true, onlyVisible: true });
				else unwatchFriends();
			});
		}

		async function loadChatSection(sectionBody, { force = false, onlyVisible = false } = {}) {
			if (onlyVisible && !friendsVisible()) return;
			if (!sectionBody || (!force && sectionBody.dataset.loaded === 'true')) {
				return;
			}

			if (!force) {
				renderLoadingState(sectionBody);
			}

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
				if (onlyVisible && !friendsVisible()) return;
				const sectionId = sectionBody.dataset.chatSectionBody;

				if (!payload?.ok) {
					throw new Error('Invalid chat section payload');
				}

				sectionBody.dataset.loaded = 'true';

				if (sectionId === 'friends') {
					renderFriendsSection(sectionBody, payload);
					return;
				}

				renderRoomSection(sectionBody, payload);
			} catch (error) {
				console.error('Failed to load chat section', error);
				if (!onlyVisible) renderMessage(sectionBody, sectionBody.dataset.errorLabel);
			}
		}

		function renderFriendsSection(sectionBody, payload) {
			const sectionId = sectionBody.dataset.chatSectionBody;

			if (!Array.isArray(payload.conversations)) {
				throw new Error('Invalid friend chats payload');
			}

			updateSectionCount(sectionId, payload.conversations.length);
			updateSectionUnreadCount(
				sectionId,
				sumUnreadCounts(
					payload.conversations,
					(item) => item.conversation?.unreadCount,
				),
				sectionBody.dataset.unreadLabel,
			);
			renderFriendChats(sectionBody, payload.conversations);
			watchFriends();
		}

		function renderRoomSection(sectionBody, payload) {
			const sectionId = sectionBody.dataset.chatSectionBody;

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
			updateSectionUnreadCount(
				sectionId,
				sumUnreadCounts(payload.rooms, (item) => item.room?.unreadCount),
				sectionBody.dataset.unreadLabel,
			);
			renderRooms(sectionBody, payload.rooms, payload.pendingRequests || []);
		}

		function updateUnreadCounts(sections, conversation = null) {
			updateSectionUnreadCountsFromPayload(sections);
			updateConversationUnreadCount(conversation);
			scheduleLoadedChatSectionsRefresh();
		}

		function scheduleLoadedChatSectionsRefresh() {
			clearTimeout(refreshTimeout);
			refreshTimeout = setTimeout(() => {
				void refreshLoadedChatSections();
			}, 150);
		}

		async function refreshLoadedChatSections() {
			const loadedSectionBodies = document.querySelectorAll(
				'[data-chat-section-body][data-loaded="true"]',
			);

			await Promise.all(
				Array.from(loadedSectionBodies, (sectionBody) => (
					loadChatSection(sectionBody, { force: true })
				)),
			);
		}

		return {
			init,
			updateUnreadCounts,
		};
	}

	window.ChatMainSections = {
		createChatSectionsController,
	};
})();
