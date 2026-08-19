//! public/js/chat/conversation-page/renderer-reactions.js

(() => {
	function createReactionPicker(message, {
		extraReactions = [],
		quickReactions = [],
		reactionUrl = '',
	} = {}) {
		if (!reactionUrl || quickReactions.length === 0) {
			return null;
		}

		const picker = document.createElement('span');
		picker.className = 'chat-message-reaction-picker';
		picker.dataset.chatMessageReactions = 'true';

		const toggle = document.createElement('button');
		toggle.className =
			'btn btn-action-outline chat-message-action chat-message-reaction-toggle';
		toggle.type = 'button';
		toggle.dataset.chatMessageReactionToggle = 'true';
		toggle.setAttribute('aria-label', 'React');
		toggle.setAttribute('aria-expanded', 'false');

		const icon = document.createElement('i');
		icon.className = 'bi bi-emoji-smile';
		icon.setAttribute('aria-hidden', 'true');

		const plusIcon = document.createElement('i');
		plusIcon.className = 'bi bi-plus chat-message-reaction-plus';
		plusIcon.setAttribute('aria-hidden', 'true');

		toggle.append(icon, plusIcon);

		const menu = document.createElement('span');
		menu.className = 'chat-message-reaction-menu';
		menu.dataset.chatMessageReactionMenu = 'true';
		menu.hidden = true;
		menu.appendChild(createReactionSearchBox());

		const quickGroup = document.createElement('span');
		quickGroup.className = 'chat-message-reaction-group';
		const reactionsByValue = new Map(
			(message.reactions || []).map((reaction) => [
				reaction.reaction,
				reaction,
			]),
		);

		for (const quickReaction of quickReactions) {
			quickGroup.appendChild(createReactionForm({
				message,
				reaction: quickReaction,
				reactionState: reactionsByValue.get(quickReaction.reaction),
				reactionUrl,
			}));
		}

		if (extraReactions.length > 0) {
			quickGroup.appendChild(createSearchReactionButton());
			quickGroup.appendChild(createMoreReactionButton());
		}

		menu.appendChild(quickGroup);

		if (extraReactions.length > 0) {
			const extraGroup = document.createElement('span');
			extraGroup.className = 'chat-message-reaction-group is-extra';
			extraGroup.dataset.chatMessageReactionExtra = 'true';
			extraGroup.hidden = true;

			for (const extraReaction of extraReactions) {
				extraGroup.appendChild(createReactionForm({
					message,
					reaction: extraReaction,
					reactionState: reactionsByValue.get(extraReaction.reaction),
					reactionUrl,
				}));
			}

			menu.appendChild(extraGroup);
		}

		picker.append(toggle, menu);
		window.AppTooltips?.initIn(picker);
		return picker;
	}

	function createReactionForm({
		message,
		reaction,
		reactionState = {},
		reactionUrl = '',
	}) {
		const count = Number(reactionState?.count || 0);
		const label = reaction.label || reactionState?.label || reaction.reaction;
		const form = document.createElement('form');
		form.className = 'chat-message-reaction-form';
		form.method = 'POST';
		form.action = reactionUrl;
		form.dataset.chatMessageReactionForm = 'true';
		form.dataset.chatMessageReactionSearchText = [
			reaction.reaction,
			reaction.label,
			...(reaction.keywords || []),
		].join(' ');

		const messageInput = document.createElement('input');
		messageInput.type = 'hidden';
		messageInput.name = 'messageId';
		messageInput.value = message.id || '';

		const reactionInput = document.createElement('input');
		reactionInput.type = 'hidden';
		reactionInput.name = 'reaction';
		reactionInput.value = reaction.reaction || '';

		const button = document.createElement('button');
		button.className = `chat-message-reaction has-tooltip has-title${reactionState?.reactedByViewer ? ' is-active' : ''}`;
		button.type = 'submit';
		button.dataset.bsTitle = label;
		button.setAttribute('aria-label', `${label}: ${count}`);

		const emoji = document.createElement('span');
		emoji.setAttribute('aria-hidden', 'true');
		emoji.textContent = reaction.reaction || '';

		button.appendChild(emoji);

		form.append(messageInput, reactionInput, button);
		return form;
	}

	function appendReactionSummary(container, reactions = []) {
		const summary = createReactionSummary(reactions);
		if (!summary) return;

		container.appendChild(summary);
	}

	function createReactionSummary(reactions = []) {
		const visibleReactions = reactions.filter((reaction) =>
			Number(reaction.count || 0) > 0,
		);

		if (visibleReactions.length === 0) {
			return null;
		}

		const summary = document.createElement('div');
		summary.className = 'chat-message-reaction-summary';
		summary.dataset.chatMessageReactionSummary = 'true';

		for (const reaction of visibleReactions) {
			const item = document.createElement('span');
			item.className = `chat-message-reaction-summary-item${reaction.reactedByViewer ? ' is-active' : ''}`;
			item.dataset.chatMessageReactionSummaryItem = 'true';
			item.dataset.messageId = reaction.messageId || '';
			item.dataset.reaction = reaction.reaction || '';
			item.dataset.reactionLabel = reaction.label || reaction.reaction || '';
			item.setAttribute('aria-pressed', reaction.reactedByViewer ? 'true' : 'false');
			item.setAttribute('role', 'button');
			item.tabIndex = 0;
			item.setAttribute(
				'aria-label',
				`${reaction.label || reaction.reaction || ''}: ${reaction.count}`,
			);

			const emoji = document.createElement('span');
			emoji.setAttribute('aria-hidden', 'true');
			emoji.textContent = reaction.reaction || '';

			const count = document.createElement('span');
			count.textContent = String(reaction.count || 0);

			item.append(emoji, count);
			summary.appendChild(item);
		}

		return summary;
	}

	function createReactionSearchBox() {
		const search = document.createElement('span');
		search.className = 'chat-message-reaction-search';
		search.dataset.chatMessageReactionSearch = 'true';
		search.hidden = true;

		const icon = document.createElement('i');
		icon.className = 'bi bi-search';
		icon.setAttribute('aria-hidden', 'true');

		const input = document.createElement('input');
		input.type = 'search';
		input.dataset.chatMessageReactionSearchInput = 'true';
		input.setAttribute('aria-label', 'Search reactions');
		input.placeholder = 'Search...';

		search.append(icon, input);
		return search;
	}

	function createSearchReactionButton() {
		const button = document.createElement('button');
		button.className = 'chat-message-reaction chat-message-reaction-search-toggle';
		button.type = 'button';
		button.dataset.chatMessageReactionSearchToggle = 'true';
		button.setAttribute('aria-label', 'Search reactions');
		button.setAttribute('aria-expanded', 'false');

		const icon = document.createElement('i');
		icon.className = 'bi bi-search';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		return button;
	}

	function createMoreReactionButton() {
		const button = document.createElement('button');
		button.className = 'chat-message-reaction chat-message-reaction-more';
		button.type = 'button';
		button.dataset.chatMessageReactionMore = 'true';
		button.setAttribute('aria-label', 'More reactions');
		button.setAttribute('aria-expanded', 'false');

		const icon = document.createElement('i');
		icon.className = 'bi bi-plus-lg';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		return button;
	}

	window.ChatConversationRendererReactions = {
		appendReactionSummary,
		createReactionPicker,
	};
})();
