//! public/js/social/render.js

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

