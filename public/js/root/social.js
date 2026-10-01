//! public/js/root/social.js

const notificationsCollapse = document.getElementById('socialNotifications');
const notificationsBody = document.getElementById('socialNotificationsBody');
const blockedCollapse = document.getElementById('socialBlocked');
const blockedBody = document.getElementById('socialBlockedBody');
const followeesCollapse = document.getElementById('socialFollowees');
const followeesBody = document.getElementById('socialFolloweesBody');
const followersCollapse = document.getElementById('socialFollowers');
const followersBody = document.getElementById('socialFollowersBody');
const socialPanel = document.getElementById('socialPanel');
const socialCountBadges = document.querySelectorAll('[data-social-count]');
const socialPresenceLabels = JSON.parse(socialPanel?.dataset.presenceLabels || '{}');
let socialSocket = null;

function isSocialPresenceVisible() {
	return document.visibilityState === 'visible' && socialPanel?.classList.contains('show');
}

function updateSocialPresence(userId, status) {
	for (const body of [followersBody, followeesBody]) {
		for (const dot of body?.querySelectorAll('[data-social-presence]') || []) {
			if (dot.dataset.socialPresence !== userId) continue;
			const resolved = Object.hasOwn(socialPresenceLabels, status) ? status : 'offline';
			dot.dataset.status = resolved;
			dot.dataset.bsTitle = socialPresenceLabels[resolved];
			dot.setAttribute('aria-label', socialPresenceLabels[resolved]);
			window.bootstrap?.Tooltip.getInstance(dot)?.setContent({ '.tooltip-inner': socialPresenceLabels[resolved] });
		}
	}
}

function watchSocialPresence() {
	if (!socialSocket?.connected || !isSocialPresenceVisible()) return;
	const section = getOpenSocialSection();
	if (!['followers', 'followees'].includes(section)) return;
	socialSocket.emit('presence:watch', { scope: `social-${section}` }, (result) => {
		if (!result?.ok || !isSocialPresenceVisible() || getOpenSocialSection() !== section) return;
		for (const item of result.statuses || []) updateSocialPresence(item.userId, item.status);
	});
}

function unwatchSocialPresence() {
	socialSocket?.emit('presence:unwatch');
}

for (const collapse of [followersCollapse, followeesCollapse]) {
	collapse?.addEventListener('hide.bs.collapse', unwatchSocialPresence);
	collapse?.addEventListener('shown.bs.collapse', watchSocialPresence);
}

document.addEventListener('visibilitychange', () => {
	if (isSocialPresenceVisible()) {
		const section = getOpenSocialSection();
		if (section === 'followers') void loadFollowers(true);
		if (section === 'followees') void loadFollowees(true);
	} else unwatchSocialPresence();
});

if (socialPanel) {
	socialPanel.addEventListener('shown.bs.offcanvas', () => {
		const section = getOpenSocialSection();
		if (section === 'followers') void loadFollowers(true);
		if (section === 'followees') void loadFollowees(true);
	});
	socialPanel.addEventListener('hide.bs.offcanvas', unwatchSocialPresence);
	socialPanel.addEventListener('show.bs.offcanvas', () => {
		void loadSocialCounts();
	});
}

connectSocialSocket();

if (notificationsCollapse && notificationsBody) {
	notificationsCollapse.addEventListener('show.bs.collapse', () => {
		void loadNotifications();
	});

	notificationsBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-social-action]');

		if (!button) return;

		event.preventDefault();
		void runSocialAction(button);
	});
}

if (blockedCollapse && blockedBody) {
	blockedCollapse.addEventListener('show.bs.collapse', () => {
		void loadBlockedUsers();
	});

	blockedBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-social-action]');

		if (!button) return;

		event.preventDefault();
		void runSocialAction(button);
	});
}

if (followeesCollapse && followeesBody) {
	followeesCollapse.addEventListener('show.bs.collapse', () => {
		void loadFollowees();
	});

	followeesBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-social-action]');

		if (!button) return;

		event.preventDefault();
		void runSocialAction(button);
	});
}

if (followersCollapse && followersBody) {
	followersCollapse.addEventListener('show.bs.collapse', () => {
		void loadFollowers();
	});

	followersBody.addEventListener('click', (event) => {
		const button = event.target.closest('[data-social-action]');

		if (!button) return;

		event.preventDefault();
		void runSocialAction(button);
	});
}

async function loadNotifications() {
	const url = notificationsBody.dataset.url;

	renderLoadingState(notificationsBody);

	try {
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

		if (!payload?.ok || !Array.isArray(payload.notifications)) {
			throw new Error('Invalid notifications payload');
		}

		updateSocialCount('notifications', payload.notifications.length);
		renderNotifications(payload.notifications);
	} catch (error) {
		console.error('Failed to load social notifications', error);
		renderMessage(notificationsBody, notificationsBody.dataset.errorLabel);
	}
}

async function loadBlockedUsers() {
	const url = blockedBody.dataset.url;

	renderLoadingState(blockedBody);

	try {
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

		if (!payload?.ok || !Array.isArray(payload.blocked)) {
			throw new Error('Invalid blocked users payload');
		}

		updateSocialCount('blocked', payload.blocked.length);
		renderBlockedUsers(payload.blocked);
	} catch (error) {
		console.error('Failed to load blocked users', error);
		renderMessage(blockedBody, blockedBody.dataset.errorLabel);
	}
}

async function loadFollowees(quiet = false) {
	const url = followeesBody.dataset.url;

	if (!quiet) renderLoadingState(followeesBody);

	try {
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

		if (!payload?.ok || !Array.isArray(payload.followees)) {
			throw new Error('Invalid followees payload');
		}

		if (quiet && (!isSocialPresenceVisible() || getOpenSocialSection() !== 'followees')) return;
		updateSocialCount('following', payload.followees.length);
		renderFollowees(payload.followees);
		if (isSocialPresenceVisible() && getOpenSocialSection() === 'followees') watchSocialPresence();
	} catch (error) {
		console.error('Failed to load followees', error);
		if (!quiet) renderMessage(followeesBody, followeesBody.dataset.errorLabel);
	}
}

async function loadFollowers(quiet = false) {
	const url = followersBody.dataset.url;

	if (!quiet) renderLoadingState(followersBody);

	try {
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

		if (!payload?.ok || !Array.isArray(payload.followers)) {
			throw new Error('Invalid followers payload');
		}

		if (quiet && (!isSocialPresenceVisible() || getOpenSocialSection() !== 'followers')) return;
		updateSocialCount('followers', payload.followers.length);
		renderFollowers(payload.followers);
		if (isSocialPresenceVisible() && getOpenSocialSection() === 'followers') watchSocialPresence();
	} catch (error) {
		console.error('Failed to load followers', error);
		if (!quiet) renderMessage(followersBody, followersBody.dataset.errorLabel);
	}
}

async function loadSocialCounts() {
	try {
		const response = await fetch('/social/counts', {
			headers: {
				Accept: 'application/json',
			},
			credentials: 'same-origin',
		});

		if (!response.ok) {
			throw new Error(`Request failed with status ${response.status}`);
		}

		const payload = await response.json();

		if (!payload?.ok || !payload.counts) {
			throw new Error('Invalid social counts payload');
		}

		updateSocialCounts(payload.counts);
	} catch (error) {
		console.error('Failed to load social counts', error);
	}
}

function connectSocialSocket() {
	if (typeof window.io !== 'function') return;

	const socket = window.io({
		withCredentials: true,
	});
	socialSocket = socket;
	socket.on('connect', watchSocialPresence);
	socket.on('presence:peer:changed', (payload) => {
		if (isSocialPresenceVisible()) updateSocialPresence(payload?.userId, payload?.status);
	});

	socket.on('social:counts:changed', () => {
		void refreshLiveSocialState();
	});
}

async function refreshLiveSocialState() {
	await loadSocialCounts();

	const openSection = getOpenSocialSection();
	if (openSection) {
		await reloadSocialSection(openSection);
	}
}

function getOpenSocialSection() {
	if (followersCollapse?.classList.contains('show')) return 'followers';
	if (followeesCollapse?.classList.contains('show')) return 'followees';
	if (blockedCollapse?.classList.contains('show')) return 'blocked';
	if (notificationsCollapse?.classList.contains('show')) return 'notifications';

	return null;
}

function updateSocialCounts(counts) {
	for (const [key, value] of Object.entries(counts)) {
		updateSocialCount(key, value);
	}
}

function updateSocialCount(key, value) {
	const count = Number(value) || 0;

	socialCountBadges.forEach((badge) => {
		if (badge.dataset.socialCount !== key) return;

		badge.textContent = new Intl.NumberFormat(
			document.documentElement.lang || 'en',
		).format(count);
	});
}

function renderNotifications(notifications) {
	notificationsBody.replaceChildren();

	if (notifications.length === 0) {
		renderMessage(notificationsBody, notificationsBody.dataset.emptyLabel);
		return;
	}

	const list = document.createElement('div');
	list.className = 'list-group list-group-flush';

	for (const notification of notifications) {
		list.appendChild(createNotificationItem(notification));
	}

	notificationsBody.appendChild(list);
	initTooltipsIn(notificationsBody);
}

function renderBlockedUsers(blockedUsers) {
	blockedBody.replaceChildren();

	if (blockedUsers.length === 0) {
		renderMessage(blockedBody, blockedBody.dataset.emptyLabel);
		return;
	}

	const list = document.createElement('div');
	list.className = 'list-group list-group-flush';

	for (const blockedUser of blockedUsers) {
		list.appendChild(createBlockedUserItem(blockedUser));
	}

	blockedBody.appendChild(list);
	initTooltipsIn(blockedBody);
}

function renderFollowees(followees) {
	followeesBody.querySelectorAll('.has-tooltip').forEach((element) => window.AppTooltips?.reset(element));
	followeesBody.replaceChildren();

	if (followees.length === 0) {
		renderMessage(followeesBody, followeesBody.dataset.emptyLabel);
		return;
	}

	const list = document.createElement('div');
	list.className = 'list-group list-group-flush';

	for (const followee of followees) {
		list.appendChild(createFolloweeItem(followee));
	}

	followeesBody.appendChild(list);
	initTooltipsIn(followeesBody);
}

function renderFollowers(followers) {
	followersBody.querySelectorAll('.has-tooltip').forEach((element) => window.AppTooltips?.reset(element));
	followersBody.replaceChildren();

	if (followers.length === 0) {
		renderMessage(followersBody, followersBody.dataset.emptyLabel);
		return;
	}

	const list = document.createElement('div');
	list.className = 'list-group list-group-flush';

	for (const follower of followers) {
		list.appendChild(createFollowerItem(follower));
	}

	followersBody.appendChild(list);
	initTooltipsIn(followersBody);
}

function createNotificationItem(notification) {
	const item = document.createElement('article');
	item.className = 'list-group-item position-relative';

	const title = document.createElement('div');
	title.className = 'fw-semibold social-notification-title';
	title.append(...buildNotificationTitleParts(notification));

	const meta = document.createElement('div');
	meta.className = 'small text-body-secondary mt-1';
	meta.textContent = formatNotificationDate(notification.created_at);

	item.append(title, meta);

	const { floatingActions, inlineActions } =
		createNotificationActions(notification);

	for (const actionButton of floatingActions) {
		item.appendChild(actionButton);
	}

	if (inlineActions) {
		item.appendChild(inlineActions);
	}

	return item;
}

function createBlockedUserItem(blockedUser) {
	const item = document.createElement('article');
	item.className = 'list-group-item';

	const title = document.createElement('div');
	title.className = 'fw-semibold social-user-title';

	const userName = document.createElement('span');
	userName.className = 'social-user-name';
	userName.textContent = blockedUser.username || blockedBody.dataset.someoneLabel;

	if (blockedUser.email) {
		userName.classList.add('has-tooltip');
		userName.dataset.bsTitle = blockedUser.email;
		userName.tabIndex = 0;
	}

	title.appendChild(userName);

	const meta = document.createElement('div');
	meta.className = 'small text-body-secondary mt-1';
	meta.textContent = formatTemplate(blockedBody.dataset.blockedAtLabel, {
		date: formatNotificationDate(blockedUser.blocked_at),
	});

	const actions = createSocialActions(
		getBlockedUserActions(blockedUser),
		blockedBody,
	);

	item.append(title, meta);

	if (actions.inlineActions) {
		item.appendChild(actions.inlineActions);
	}

	return item;
}

function createFolloweeItem(followee) {
	const item = document.createElement('article');
	item.className = 'list-group-item';

	const title = document.createElement('div');
	title.className = 'fw-semibold social-user-title';

	const userName = document.createElement('span');
	userName.className = 'social-user-name';
	userName.textContent = followee.username || followeesBody.dataset.someoneLabel;

	if (followee.email) {
		userName.classList.add('has-tooltip');
		userName.dataset.bsTitle = followee.email;
		userName.tabIndex = 0;
	}

	title.append(createSocialPresenceDot(followee.id, followee.status), userName);

	const meta = document.createElement('div');
	meta.className = 'small text-body-secondary mt-1';
	meta.textContent = formatTemplate(followeesBody.dataset.followedAtLabel, {
		date: formatNotificationDate(followee.followed_at),
	});

	const actions = createSocialActions(
		getFolloweeActions(followee),
		followeesBody,
	);

	item.append(title, meta);

	if (actions.inlineActions) {
		item.appendChild(actions.inlineActions);
	}

	return item;
}

function createFollowerItem(follower) {
	const item = document.createElement('article');
	item.className = 'list-group-item';

	const title = document.createElement('div');
	title.className = 'fw-semibold social-user-title';

	const userName = document.createElement('span');
	userName.className = 'social-user-name';
	userName.textContent = follower.username || followersBody.dataset.someoneLabel;

	if (follower.email) {
		userName.classList.add('has-tooltip');
		userName.dataset.bsTitle = follower.email;
		userName.tabIndex = 0;
	}

	title.append(createSocialPresenceDot(follower.id, follower.status), userName);

	const meta = document.createElement('div');
	meta.className = 'small text-body-secondary mt-1';
	meta.textContent = formatTemplate(followersBody.dataset.followedAtLabel, {
		date: formatNotificationDate(follower.followed_at),
	});

	const actions = createSocialActions(
		getFollowerActions(follower),
		followersBody,
	);

	item.append(title, meta);

	if (actions.inlineActions) {
		item.appendChild(actions.inlineActions);
	}

	return item;
}

function createSocialPresenceDot(userId, status) {
	const dot = document.createElement('span');
	dot.className = 'presence-dot has-tooltip me-2';
	dot.dataset.socialPresence = userId;
	if (Object.hasOwn(socialPresenceLabels, status)) {
		dot.dataset.status = status;
		dot.dataset.bsTitle = socialPresenceLabels[status];
		dot.setAttribute('aria-label', socialPresenceLabels[status]);
	}
	dot.setAttribute('role', 'img');
	dot.tabIndex = 0;
	return dot;
}

function buildNotificationTitleParts(notification) {
	const actorName =
		notification.actor_username || notificationsBody.dataset.someoneLabel;
	const actor = document.createElement('span');
	actor.className = 'social-notification-actor';
	actor.textContent = actorName;

	if (notification.actor_email) {
		actor.classList.add('has-tooltip');
		actor.dataset.bsTitle = notification.actor_email;
		actor.tabIndex = 0;
	}

	if (notification.type === 'follow_request') {
		return buildTemplateParts(
			notificationsBody.dataset.followRequestLabel,
			actor,
		);
	}

	if (notification.type === 'follow_started') {
		return buildTemplateParts(
			notificationsBody.dataset.followStartedLabel,
			actor,
		);
	}

	if (notification.type === 'follow_request_accepted') {
		return buildTemplateParts(
			notificationsBody.dataset.followRequestAcceptedLabel,
			actor,
		);
	}

	if (notification.type === 'follow_request_accepted_followed_back') {
		return buildTemplateParts(
			notificationsBody.dataset.followRequestAcceptedFollowedBackLabel,
			actor,
		);
	}

	return [actor];
}

function buildTemplateParts(template, actor) {
	const marker = '{{user}}';
	const fallback = [actor];

	if (!template || !template.includes(marker)) {
		fallback.push(document.createTextNode(` ${template || ''}`));
		return fallback;
	}

	const parts = template.split(marker);
	const nodes = [];

	parts.forEach((part, index) => {
		if (part) {
			nodes.push(document.createTextNode(part));
		}

		if (index < parts.length - 1) {
			nodes.push(actor);
		}
	});

	return nodes;
}

function formatNotificationDate(value) {
	if (!value) return '';

	const date = new Date(value);

	if (Number.isNaN(date.getTime())) return '';

	return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date);
}

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

function renderMessage(sectionBody, message) {
	sectionBody.replaceChildren();

	const paragraph = document.createElement('p');
	paragraph.className = 'text-body-secondary mb-0';
	paragraph.textContent = message;

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
	label.textContent = sectionBody.dataset.loadingLabel;

	spinner.appendChild(label);
	wrapper.appendChild(spinner);
	sectionBody.appendChild(wrapper);
}

function formatTemplate(template, values) {
	if (!template) return '';

	return Object.entries(values).reduce(
		(result, [key, value]) => result.replaceAll(`{{${key}}}`, value || ''),
		template,
	);
}
