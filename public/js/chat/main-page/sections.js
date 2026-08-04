//! public/js/chat/main-page/sections.js

(() => {
	const {
		getSectionBody,
		renderLoadingState,
		renderMessage,
		sumUnreadCounts,
	} = window.ChatMainUtils;
	const {
		updateSectionCount,
		updateSectionUnreadCount,
		updateSectionUnreadCountsFromPayload,
	} = window.ChatMainBadges;
	const { renderFriendChats, renderRooms } = window.ChatMainCards;

	function createChatSectionsController({ lazySections }) {
		let refreshTimeout = null;

		function init() {
			for (const sectionCollapse of lazySections) {
				const sectionId = sectionCollapse.dataset.chatSectionCollapse;
				const sectionBody = getSectionBody(sectionId);

				if (!sectionBody) continue;

				sectionCollapse.addEventListener('show.bs.collapse', () => {
					void loadChatSection(sectionBody);
				});

				if (sectionCollapse.classList.contains('show')) {
					void loadChatSection(sectionBody);
				}
			}
		}

		async function loadChatSection(sectionBody, { force = false } = {}) {
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
				renderMessage(sectionBody, sectionBody.dataset.errorLabel);
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

		function updateUnreadCounts(sections) {
			updateSectionUnreadCountsFromPayload(sections);
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
