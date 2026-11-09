//! public/js/social/actions.js

function createNotificationActions(notification) {
	return createSocialActions(getNotificationActions(notification), notificationsBody);
}

function createSocialActions(actionConfigs, sectionBody) {
	if (actionConfigs.length === 0) {
		return {
			floatingActions: [],
			inlineActions: null,
		};
	}

	const container = document.createElement('div');
	container.className = 'd-flex flex-wrap gap-2 mt-3';
	const floatingActions = [];

	for (const config of actionConfigs) {
		const button = createActionButton(config, sectionBody);

		if (config.floating) {
			floatingActions.push(button);
			continue;
		}

		container.appendChild(button);
	}

	return {
		floatingActions,
		inlineActions: container.childElementCount > 0 ? container : null,
	};
}

function getNotificationActions(notification) {
	return Array.isArray(notification.actions)
		? notification.actions.map((action) => normalizeActionConfig(action))
		: [];
}

function getBlockedUserActions(blockedUser) {
	return Array.isArray(blockedUser.actions)
		? blockedUser.actions.map((action) =>
				normalizeActionConfig(action, blockedBody),
			)
		: [];
}

function getFolloweeActions(followee) {
	return Array.isArray(followee.actions)
		? followee.actions.map((action) =>
				normalizeActionConfig(action, followeesBody),
			)
		: [];
}

function getFollowerActions(follower) {
	return Array.isArray(follower.actions)
		? follower.actions.map((action) =>
				normalizeActionConfig(action, followersBody),
			)
		: [];
}

function normalizeActionConfig(action, sectionBody = notificationsBody) {
	const baseConfig = {
		payload: action,
		floating: action.name === 'ignore_notification',
	};

	if (action.name === 'accept_follow_request') {
		return {
			...baseConfig,
			className: 'social-action--accept',
			icon: 'bi-check2',
			label: sectionBody.dataset.acceptLabel,
		};
	}

	if (action.name === 'follow_back') {
		return {
			...baseConfig,
			className: 'social-action--follow-back',
			icon: 'bi-repeat',
			label: sectionBody.dataset.followBackLabel,
		};
	}

	if (action.name === 'reject_follow_request') {
		return {
			...baseConfig,
			className: 'social-action--decline',
			icon: 'bi-x-lg',
			label: sectionBody.dataset.declineLabel,
		};
	}

	if (action.name === 'block_user') {
		return {
			...baseConfig,
			className: 'social-action--block',
			icon: 'bi-ban',
			label: sectionBody.dataset.blockLabel,
		};
	}

	if (action.name === 'ignore_notification') {
		return {
			...baseConfig,
			className: 'social-action--ignore',
			icon: 'bi-x',
			label: sectionBody.dataset.ignoreLabel,
			floating: true,
		};
	}

	if (action.name === 'unblock_user') {
		return {
			...baseConfig,
			className: 'social-action--unblock',
			icon: 'bi-unlock',
			label: sectionBody.dataset.unblockLabel,
		};
	}

	if (action.name === 'unblock_and_follow_request') {
		return {
			...baseConfig,
			className: 'social-action--follow-back',
			icon: 'bi-person-plus',
			label: sectionBody.dataset.unblockFollowRequestLabel,
		};
	}

	if (action.name === 'unfollow_user') {
		return {
			...baseConfig,
			className: 'social-action--unfollow',
			icon: 'bi-person-dash',
			label: sectionBody.dataset.unfollowLabel,
		};
	}

	if (action.name === 'remove_follow_relationships') {
		return {
			...baseConfig,
			className: 'social-action--remove-both',
			icon: 'bi-people',
			label: sectionBody.dataset.removeBothLabel,
		};
	}

	if (action.name === 'remove_follower') {
		return {
			...baseConfig,
			className: 'social-action--remove-follower',
			icon: 'bi-person-x',
			label: sectionBody.dataset.removeFollowerLabel,
		};
	}

	return {
		...baseConfig,
		className: 'social-action--default',
		icon: 'bi-circle',
		label: action.name,
	};
}

function createActionButton(config, sectionBody) {
	const button = document.createElement('button');
	button.type = 'button';
	button.className = config.floating
		? `social-action social-action--floating ${config.className} has-tooltip`
		: `social-action ${config.className} has-tooltip`;
	button.dataset.socialAction = config.payload.name;
	button.dataset.socialPayload = JSON.stringify(config.payload);
	button.dataset.socialSection = sectionBody.dataset.section;
	button.dataset.bsTitle = config.label;
	button.setAttribute('aria-label', config.label);

	const icon = document.createElement('i');
	icon.className = `bi ${config.icon}`;
	button.appendChild(icon);

	if (!config.floating) {
		const text = document.createElement('span');
		text.className = 'visually-hidden';
		text.textContent = config.label;
		button.appendChild(text);
	}

	return button;
}

async function runSocialAction(button) {
	const sectionBody = button.closest('[data-social-section-body]');
	const url = sectionBody?.dataset.actionUrl;
	let payload;

	if (!sectionBody || !url) {
		console.error('Social action section is missing');
		return;
	}

	try {
		payload = JSON.parse(button.dataset.socialPayload);
	} catch {
		console.error('Invalid social action payload');
		return;
	}

	setActionButtonsDisabled(sectionBody, true);

	try {
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
			credentials: 'same-origin',
			body: JSON.stringify({
				action: payload.name,
				targetUserId: payload.targetUserId,
				followRequestId: payload.followRequestId,
				notificationId: payload.notificationId,
			}),
		});

		const responsePayload = await response.json();

		if (!response.ok || !responsePayload?.ok) {
			throw new Error(
				responsePayload?.error || 'Notification action failed',
			);
		}

		await reloadSocialSection(sectionBody.dataset.section);
		await loadSocialCounts();
	} catch (error) {
		console.error('Failed to run social action', error);
		renderActionError(sectionBody, sectionBody.dataset.actionErrorLabel);
	} finally {
		setActionButtonsDisabled(sectionBody, false);
	}
}

function reloadSocialSection(section) {
	if (section === 'followers') {
		return loadFollowers();
	}

	if (section === 'followees') {
		return loadFollowees();
	}

	if (section === 'blocked') {
		return loadBlockedUsers();
	}

	return loadNotifications();
}

function renderActionError(sectionBody, message) {
	const existingAlert = sectionBody.querySelector(
		'[data-social-action-error]',
	);

	if (existingAlert) {
		existingAlert.remove();
	}

	const alert = document.createElement('div');
	alert.className = 'alert alert-danger py-2 px-3 mb-3';
	alert.dataset.socialActionError = 'true';
	alert.textContent = message;

	sectionBody.prepend(alert);
}

function setActionButtonsDisabled(sectionBody, disabled) {
	sectionBody
		.querySelectorAll('[data-social-action]')
		.forEach((button) => {
			button.disabled = disabled;
		});
}

