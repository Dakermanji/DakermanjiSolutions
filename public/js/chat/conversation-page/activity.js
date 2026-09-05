//! public/js/chat/conversation-page/activity.js

(() => {
	const {
		formatDateTime,
		getUserName,
		parseJsonScript,
	} = window.ChatConversationUtils;

	const activityIcons = Object.freeze({
		admin_demoted: 'bi-arrow-down-circle',
		flagged_message_deleted: 'bi-shield-x',
		join_request_approved: 'bi-check-circle',
		join_request_rejected: 'bi-x-circle',
		member_invited: 'bi-person-plus',
		member_joined: 'bi-person-check',
		member_left: 'bi-box-arrow-left',
		member_banned: 'bi-slash-circle',
		member_history_deleted: 'bi-trash3',
		member_muted: 'bi-volume-mute',
		member_promoted: 'bi-arrow-up-circle',
		member_removed: 'bi-person-dash',
		member_unbanned: 'bi-unlock',
		member_unmuted: 'bi-volume-up',
		message_deleted_by_admin: 'bi-trash3',
		message_flagged: 'bi-flag',
		message_marked_safe: 'bi-shield-check',
		pending_message_approved: 'bi-check2-circle',
		pending_message_hidden: 'bi-eye-slash',
		room_info_updated: 'bi-info-circle',
		room_invitation_queued: 'bi-envelope-plus',
		room_invitation_accepted: 'bi-check2-circle',
		room_invitation_rejected: 'bi-x-circle',
	});

	function createActivityPanel({
		chatPage,
		labelsNode,
		list,
		loadMoreButton,
		state,
		count,
	}) {
		const labels = parseJsonScript(labelsNode);
		let isLoaded = false;
		let isLoading = false;
		let nextPage = 1;

		async function loadActivityLogs() {
			if (
				!list ||
				isLoading ||
				(isLoaded && nextPage <= 0)
			) {
				return;
			}

			isLoading = true;
			setActivityState(chatPage.dataset.activityLoadingLabel || '');
			if (loadMoreButton) {
				loadMoreButton.disabled = true;
			}

			const params = new URLSearchParams({
				conversationId: chatPage.dataset.activeConversationId,
				page: String(nextPage),
			});

			try {
				const response = await fetch(
					`${chatPage.dataset.activityUrl}?${params.toString()}`,
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

				if (!payload?.ok || !payload.activityPage) {
					throw new Error('Invalid activity log payload');
				}

				renderActivityLogs(payload.activityPage);
			} catch (error) {
				console.error('Failed to load room activity logs', error);
				setActivityState(chatPage.dataset.activityErrorLabel || '');
			} finally {
				isLoading = false;
				if (loadMoreButton) {
					loadMoreButton.disabled = false;
				}
			}
		}

		function renderActivityLogs(activityPage) {
			const items = Array.isArray(activityPage.items) ? activityPage.items : [];

			for (const item of items) {
				list.appendChild(createActivityItem(item));
			}

			isLoaded = true;
			nextPage = activityPage.hasNextPage ? activityPage.page + 1 : 0;

			if (count) {
				count.textContent = String(activityPage.total || list.children.length);
			}

			if (loadMoreButton) {
				loadMoreButton.hidden = !activityPage.hasNextPage;
				loadMoreButton.textContent =
					chatPage.dataset.activityLoadMoreLabel ||
					loadMoreButton.textContent;
			}

			setActivityState(
				list.children.length > 0
					? ''
					: chatPage.dataset.activityEmptyLabel || '',
			);
		}

		function createActivityItem(activity) {
			const item = document.createElement('li');
			item.className = 'chat-activity-item';

			const icon = document.createElement('span');
			icon.className = 'chat-activity-icon';
			icon.setAttribute('aria-hidden', 'true');
			icon.innerHTML =
				`<i class="bi ${activityIcons[activity.action] || 'bi-dot'}"></i>`;

			const time = document.createElement('time');
			time.className = 'chat-activity-time';
			time.dateTime = activity.createdAt || '';
			time.textContent = formatDateTime(activity.createdAt);

			const text = document.createElement('p');
			text.className = 'chat-activity-text';
			appendActivitySentence(text, activity);

			const details = createActivityDetails(activity);
			if (details) {
				text.append(' ');
				text.appendChild(details);
			}

			item.append(icon, text, time);

			return item;
		}

		function appendActivitySentence(text, activity) {
			const actorName =
				getUserName(activity.actor) ||
				chatPage.dataset.activitySystemLabel ||
				'System';
			const targetName = getUserName(activity.target);
			const label =
				labels[activity.action] ||
				activity.action?.replaceAll('_', ' ') ||
				'';

			appendStrongText(text, actorName);
			text.append(` ${label}`);

			if (targetName) {
				text.append(' ');
				appendStrongText(text, targetName);
			}
		}

		function appendStrongText(parent, text) {
			const strong = document.createElement('strong');
			strong.textContent = text;
			parent.appendChild(strong);
		}

		function createActivityDetails(activity) {
			const metadata = activity?.metadata || {};
			const details = [];

			if (
				Array.isArray(metadata.changedFields) &&
				metadata.changedFields.length > 0
			) {
				details.push(formatActivityFields(metadata.changedFields));
			}

			if (details.length === 0) return null;

			const span = document.createElement('span');
			span.className = 'chat-activity-details';
			span.textContent = `(${details.join(' · ')})`;

			return span;
		}

		function formatActivityFields(fields) {
			return fields
				.map((field) =>
					chatPage.dataset[`activityFieldLabel${toDatasetSuffix(field)}`] ||
					field)
				.join(', ');
		}

		function toDatasetSuffix(value) {
			return String(value || '')
				.split(/[_-]/)
				.filter(Boolean)
				.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
				.join('');
		}

		function setActivityState(message) {
			if (!state) return;

			state.hidden = !message;
			const stateText = state.querySelector('p');
			if (stateText) {
				stateText.textContent = message;
			}
		}

		return { loadActivityLogs };
	}

	window.ChatConversationActivity = {
		createActivityPanel,
	};
})();
