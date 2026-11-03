//! public/js/kanban/taskMentions.js

(() => {
	const LEFT_TO_RIGHT_MARK = '\u200e';
	const USERNAME_CHARS = /^[a-zA-Z0-9_.-]{0,20}$/;
	const USERNAME_CHARACTER = /^[a-zA-Z0-9_.-]$/;
	const TOKEN_PATTERN = /(^|[^a-zA-Z0-9_.-])@([a-zA-Z0-9_.-]{0,20})$/;
	const MAX_VISIBLE_SUGGESTIONS = 8;
	const page = document.querySelector('.kanban-page[data-kanban-mention-members]');
	if (!page) return;

	const members = parseMembers(page.dataset.kanbanMentionMembers);
	if (members.length === 0) return;

	for (const input of page.querySelectorAll('[data-kanban-mention-input]')) {
		const form = input.closest('form');
		const menu = form?.querySelector('[data-kanban-mention-menu]');
		if (!menu) continue;

		let activeToken = null;
		let activeIndex = 0;
		let visibleMembers = [];

		input.addEventListener('input', handleInput);
		input.addEventListener('keydown', handleKeydown);
		input.addEventListener('blur', () => {
			setTimeout(() => {
				if (!form.contains(document.activeElement)) hideMenu();
			}, 0);
		});
		document.addEventListener('click', (event) => {
			if (!form.contains(event.target)) hideMenu();
		});

		function handleInput() {
			isolateActiveMentionTokenStart(input);
			activeToken = findActiveMentionToken(input);
			if (!activeToken) {
				hideMenu();
				return;
			}

			const query = activeToken.query.toLowerCase();
			visibleMembers = members
				.filter((member) => member.username.toLowerCase().includes(query))
				.sort((a, b) => {
					const aStarts = a.username.toLowerCase().startsWith(query);
					const bStarts = b.username.toLowerCase().startsWith(query);
					return Number(bStarts) - Number(aStarts)
						|| a.username.localeCompare(b.username);
				})
				.slice(0, MAX_VISIBLE_SUGGESTIONS);
			activeIndex = 0;
			renderMenu();
		}

		function handleKeydown(event) {
			if (menu.hidden) return;
			if (event.key === 'Escape') {
				event.preventDefault();
				hideMenu();
			} else if (event.key === 'ArrowDown' && visibleMembers.length) {
				event.preventDefault();
				moveActiveMember(1);
			} else if (event.key === 'ArrowUp' && visibleMembers.length) {
				event.preventDefault();
				moveActiveMember(-1);
			} else if ((event.key === 'Tab' || event.key === 'Enter') && visibleMembers[activeIndex]) {
				event.preventDefault();
				insertMention(visibleMembers[activeIndex]);
			}
		}

		function renderMenu() {
			menu.textContent = '';
			if (visibleMembers.length === 0) {
				hideMenu();
				return;
			}

			visibleMembers.forEach((member, index) => {
				const option = document.createElement('button');
				option.type = 'button';
				option.className = 'kanban-mention-option';
				option.role = 'option';
				option.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
				option.dir = 'ltr';
				option.textContent = `@${member.username}`;
				option.addEventListener('mousedown', (event) => event.preventDefault());
				option.addEventListener('click', () => insertMention(member));
				menu.appendChild(option);
			});

			menu.hidden = false;
			input.setAttribute('aria-expanded', 'true');
		}

		function moveActiveMember(offset) {
			activeIndex = (activeIndex + offset + visibleMembers.length) % visibleMembers.length;
			menu.querySelectorAll('[role="option"]').forEach((option, index) => {
				option.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
			});
		}

		function insertMention(member) {
			if (!activeToken || !member?.username) return;

			const value = input.value;
			let before = value.slice(0, activeToken.start);
			if (before.endsWith(LEFT_TO_RIGHT_MARK)) before = before.slice(0, -1);
			const mentionText = `${LEFT_TO_RIGHT_MARK}@${member.username}${LEFT_TO_RIGHT_MARK} `;
			const nextValue = `${before}${mentionText}${value.slice(activeToken.end)}`;
			const nextCursor = before.length + mentionText.length;
			input.value = nextValue;
			input.setSelectionRange(nextCursor, nextCursor);
			hideMenu();
			input.focus();
			input.dispatchEvent(new Event('input', { bubbles: true }));
		}

		function hideMenu() {
			menu.hidden = true;
			menu.textContent = '';
			input.setAttribute('aria-expanded', 'false');
			activeToken = null;
			activeIndex = 0;
			visibleMembers = [];
		}
	}

	function isolateActiveMentionTokenStart(input) {
		if (document.documentElement.dir !== 'rtl') return;
		const caret = input.selectionStart ?? 0;
		if (caret !== (input.selectionEnd ?? caret)) return;

		const value = input.value;
		const beforeCaret = value.slice(0, caret);
		const atIndex = beforeCaret.lastIndexOf('@');
		if (atIndex < 0) return;

		const query = beforeCaret.slice(atIndex + 1);
		if (!USERNAME_CHARS.test(query)) return;
		const previousCharacter = value.charAt(atIndex - 1);
		if (previousCharacter === LEFT_TO_RIGHT_MARK) return;
		if (previousCharacter && USERNAME_CHARACTER.test(previousCharacter)) return;

		input.value = value.slice(0, atIndex) + LEFT_TO_RIGHT_MARK + value.slice(atIndex);
		input.setSelectionRange(caret + 1, caret + 1);
	}

	function findActiveMentionToken(input) {
		const caret = input.selectionStart ?? 0;
		if (caret !== (input.selectionEnd ?? caret)) return null;
		const beforeCaret = input.value.slice(0, caret);
		const match = beforeCaret.match(TOKEN_PATTERN);
		if (!match) return null;

		return {
			query: match[2] || '',
			start: beforeCaret.length - (match[2] || '').length - 1,
			end: caret,
		};
	}

	function parseMembers(value) {
		try {
			const parsed = JSON.parse(value || '[]');
			if (!Array.isArray(parsed)) return [];
			return parsed
				.map((member) => ({
					id: String(member.id || ''),
					username: String(member.username || '').trim(),
				}))
				.filter((member) => member.id && member.username);
		} catch {
			return [];
		}
	}
})();
