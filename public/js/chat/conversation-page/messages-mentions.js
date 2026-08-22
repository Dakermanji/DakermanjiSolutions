//! public/js/chat/conversation-page/messages-mentions.js

(() => {
	const TOKEN_PATTERN = /(^|[^a-zA-Z0-9_.-])@([a-zA-Z0-9_.-]{0,20})$/;
	const MAX_VISIBLE_SUGGESTIONS = 8;

	function createMentionController({ chatPage, composer, focusComposerInput }) {
		const input = composer?.elements.message || null;
		const menu = composer?.querySelector('[data-chat-mention-menu]') || null;
		const mentionUsers = parseMentionUsers(chatPage?.dataset.mentionUsers);
		let activeIndex = 0;
		let activeToken = null;
		let visibleSuggestions = [];

		function handleInput() {
			if (!input || !menu || mentionUsers.length === 0) return;

			activeToken = findActiveMentionToken(input);
			if (!activeToken) {
				hideSuggestions();
				return;
			}

			visibleSuggestions = filterMentionUsers(
				mentionUsers,
				activeToken.query,
			).slice(0, MAX_VISIBLE_SUGGESTIONS);
			activeIndex = 0;
			renderSuggestions();
		}

		function handleKeydown(event) {
			if (menu?.hidden) return;

			if (event.key === 'Escape') {
				event.preventDefault();
				hideSuggestions();
				return;
			}

			if (event.key === 'ArrowDown') {
				event.preventDefault();
				moveActiveSuggestion(1);
				return;
			}

			if (event.key === 'ArrowUp') {
				event.preventDefault();
				moveActiveSuggestion(-1);
				return;
			}

			if (event.key === 'Tab' || event.key === 'Enter') {
				const suggestion = visibleSuggestions[activeIndex];
				if (!suggestion) return;

				event.preventDefault();
				insertMention(suggestion);
			}
		}

		function handleBlur() {
			setTimeout(() => {
				if (composer?.contains(document.activeElement)) return;

				hideSuggestions();
			}, 0);
		}

		function handleOutsideClick(event) {
			if (!menu || menu.hidden) return;
			if (composer?.contains(event.target)) return;

			hideSuggestions();
		}

		function renderSuggestions() {
			menu.textContent = '';

			if (visibleSuggestions.length === 0) {
				hideSuggestions();
				return;
			}

			visibleSuggestions.forEach((user, index) => {
				const button = document.createElement('button');
				button.type = 'button';
				button.className = 'chat-mention-option';
				button.role = 'option';
				button.dataset.chatMentionIndex = String(index);
				button.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');

				const avatar = document.createElement('span');
				avatar.className = 'chat-mention-avatar';
				if (user.avatar?.src) {
					const image = document.createElement('img');
					image.src = user.avatar.src;
					image.alt = '';
					avatar.appendChild(image);
				} else {
					avatar.textContent = getInitial(user);
				}
				if (user.avatar?.background) {
					avatar.style.background = user.avatar.background;
				}

				const body = document.createElement('span');
				body.className = 'chat-mention-option-body';

				const username = document.createElement('strong');
				username.textContent = `@${user.username}`;
				body.appendChild(username);

				if (user.displayName && user.displayName !== user.username) {
					const displayName = document.createElement('span');
					displayName.textContent = user.displayName;
					body.appendChild(displayName);
				}

				button.append(avatar, body);
				button.addEventListener('mousedown', (event) => {
					event.preventDefault();
				});
				button.addEventListener('click', () => insertMention(user));
				menu.appendChild(button);
			});

			menu.hidden = false;
			input?.setAttribute('aria-expanded', 'true');
		}

		function moveActiveSuggestion(offset) {
			if (visibleSuggestions.length === 0) return;

			activeIndex = (
				activeIndex + offset + visibleSuggestions.length
			) % visibleSuggestions.length;

			menu
				?.querySelectorAll('[data-chat-mention-index]')
				.forEach((button, index) => {
					button.setAttribute(
						'aria-selected',
						index === activeIndex ? 'true' : 'false',
					);
				});
		}

		function insertMention(user) {
			if (!input || !activeToken || !user?.username) return;

			const value = input.value;
			const before = value.slice(0, activeToken.start);
			const after = value.slice(activeToken.end);
			const mentionText = `@${user.username} `;
			const nextValue = `${before}${mentionText}${after}`;
			const nextCursor = before.length + mentionText.length;

			input.value = nextValue;
			input.setSelectionRange(nextCursor, nextCursor);
			hideSuggestions();
			focusComposerInput?.();
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}

		function hideSuggestions() {
			if (menu) {
				menu.hidden = true;
				menu.textContent = '';
			}
			input?.setAttribute('aria-expanded', 'false');
			visibleSuggestions = [];
			activeToken = null;
			activeIndex = 0;
		}

		return {
			handleBlur,
			handleInput,
			handleKeydown,
			handleOutsideClick,
		};
	}

	function findActiveMentionToken(input) {
		const caret = input.selectionStart ?? 0;
		if (caret !== (input.selectionEnd ?? caret)) return null;

		const beforeCaret = input.value.slice(0, caret);
		const match = beforeCaret.match(TOKEN_PATTERN);
		if (!match) return null;

		const prefix = match[1] || '';
		const query = match[2] || '';
		const start = beforeCaret.length - query.length - 1;

		return {
			query,
			start,
			end: caret,
			prefix,
		};
	}

	function filterMentionUsers(users, query) {
		const normalizedQuery = String(query || '').toLowerCase();
		if (!normalizedQuery) return users;

		return users
			.map((user) => ({
				user,
				rank: getSuggestionRank(user, normalizedQuery),
			}))
			.filter((item) => item.rank !== Number.POSITIVE_INFINITY)
			.sort((a, b) => a.rank - b.rank || a.user.username.localeCompare(b.user.username))
			.map((item) => item.user);
	}

	function getSuggestionRank(user, query) {
		const username = String(user.username || '').toLowerCase();
		const displayName = String(user.displayName || '').toLowerCase();

		if (username.startsWith(query)) return 0;
		if (displayName.startsWith(query)) return 1;
		if (username.includes(query)) return 2;
		if (displayName.includes(query)) return 3;

		return Number.POSITIVE_INFINITY;
	}

	function parseMentionUsers(value) {
		try {
			const users = JSON.parse(value || '[]');
			if (!Array.isArray(users)) return [];

			return users
				.map((user) => ({
					id: user.id || '',
					username: String(user.username || '').trim(),
					displayName: String(user.displayName || user.username || '').trim(),
					avatar: user.avatar || null,
				}))
				.filter((user) => user.id && user.username);
		} catch (error) {
			return [];
		}
	}

	function getInitial(user) {
		return String(user.displayName || user.username || '?')
			.trim()
			.slice(0, 1)
			.toUpperCase();
	}

	window.ChatConversationMessageMentions = {
		createMentionController,
	};
})();
