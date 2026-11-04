//! public/js/chat/conversation-page/messages-mentions.js

(() => {
	const TOKEN_PATTERN = /(^|[^a-zA-Z0-9_.-])@([a-zA-Z0-9_.-]{0,20})$/;
	const MAX_VISIBLE_SUGGESTIONS = 8;

	function createMentionController({ chatPage, composer, focusComposerInput }) {
		const editor = composer?.querySelector('[data-chat-message-editor]') || null;
		const valueField = composer?.querySelector('[data-chat-message-value]') || null;
		const menu = composer?.querySelector('[data-chat-mention-menu]') || null;
		const mentionUsers = parseMentionUsers(chatPage?.dataset.mentionUsers);
		let activeIndex = 0;
		let activeToken = null;
		let visibleSuggestions = [];

		function handleInput() {
			if (!editor) return;

			enforceMaxLength();
			syncMessageValue();
			if (!menu || mentionUsers.length === 0) return;

			activeToken = findActiveMentionToken(editor);
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
			if (!menu?.hidden) {
				if (event.key === 'Escape') {
					event.preventDefault();
					hideSuggestions();
					return;
				}
				if (event.key === 'ArrowDown' && visibleSuggestions.length) {
					event.preventDefault();
					moveActiveSuggestion(1);
					return;
				}
				if (event.key === 'ArrowUp' && visibleSuggestions.length) {
					event.preventDefault();
					moveActiveSuggestion(-1);
					return;
				}
				if ((event.key === 'Tab' || event.key === 'Enter') && visibleSuggestions[activeIndex]) {
					event.preventDefault();
					insertMention(visibleSuggestions[activeIndex]);
					return;
				}
			}

			if (event.key === 'Enter') {
				event.preventDefault();
				if (event.shiftKey) {
					insertTextAtSelection(editor, '\n');
					editor?.dispatchEvent(new Event('input', { bubbles: true }));
					return;
				}
				syncMessageValue();
				composer?.requestSubmit();
			}
		}

		function handlePaste(event) {
			if (!editor) return;
			event.preventDefault();
			insertTextAtSelection(editor, event.clipboardData?.getData('text/plain') || '');
			editor.dispatchEvent(new Event('input', { bubbles: true }));
		}

		function handleBlur() {
			setTimeout(() => {
				if (composer?.contains(document.activeElement)) return;

				hideSuggestions();
			}, 0);
		}

		function handleOutsideClick(event) {
			if (!menu || menu.hidden || composer?.contains(event.target)) return;
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
				button.setAttribute('role', 'option');
				button.dataset.chatMentionIndex = String(index);
				button.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
				button.dir = 'ltr';

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
				if (user.avatar?.background) avatar.style.background = user.avatar.background;

				const body = document.createElement('span');
				body.className = 'chat-mention-option-body';
				const username = document.createElement('strong');
				username.dir = 'ltr';
				username.textContent = `@${user.username}`;
				body.appendChild(username);

				if (user.displayName && user.displayName !== user.username) {
					const displayName = document.createElement('span');
					displayName.dir = 'auto';
					displayName.textContent = user.displayName;
					body.appendChild(displayName);
				}

				button.append(avatar, body);
				button.addEventListener('mousedown', (event) => event.preventDefault());
				button.addEventListener('click', () => insertMention(user));
				menu.appendChild(button);
			});

			menu.hidden = false;
			editor?.setAttribute('aria-expanded', 'true');
		}

		function moveActiveSuggestion(offset) {
			if (visibleSuggestions.length === 0) return;
			activeIndex = (activeIndex + offset + visibleSuggestions.length) % visibleSuggestions.length;
			menu?.querySelectorAll('[data-chat-mention-index]').forEach((button, index) => {
				button.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
			});
		}

		function insertMention(user) {
			if (!editor || !activeToken || !user?.username) return;
			const start = getTextPoint(editor, activeToken.start);
			const end = getTextPoint(editor, activeToken.end);
			if (!start || !end) return;

			const range = document.createRange();
			range.setStart(start.node, start.offset);
			range.setEnd(end.node, end.offset);
			range.deleteContents();

			const mention = document.createElement('span');
			mention.className = 'app-mention';
			mention.dataset.chatMentionToken = '';
			mention.dir = 'ltr';
			mention.textContent = `@${user.username}`;
			range.insertNode(mention);

			const space = document.createTextNode(' ');
			mention.parentNode.insertBefore(space, mention.nextSibling);
			setCaret(space, space.length);
			hideSuggestions();
			focusComposerInput?.();
			editor.dispatchEvent(new Event('input', { bubbles: true }));
		}

		function syncMessageValue() {
			if (valueField && editor) valueField.value = getEditorText(editor);
		}

		function getMessageText() {
			return editor ? getEditorText(editor) : String(valueField?.value || '');
		}

		function clearMessage() {
			if (editor) editor.replaceChildren();
			if (valueField) valueField.value = '';
			hideSuggestions();
		}

		function enforceMaxLength() {
			const maxLength = Number(editor?.dataset.maxLength);
			const text = getEditorText(editor);
			if (!Number.isFinite(maxLength) || text.length <= maxLength) return;
			editor.textContent = text.slice(0, maxLength);
			setCaretAtEnd(editor);
		}

		function hideSuggestions() {
			if (menu) {
				menu.hidden = true;
				menu.textContent = '';
			}
			editor?.setAttribute('aria-expanded', 'false');
			visibleSuggestions = [];
			activeToken = null;
			activeIndex = 0;
		}

		return {
			clearMessage,
			getMessageText,
			handleBlur,
			handleInput,
			handleKeydown,
			handleOutsideClick,
			handlePaste,
			syncMessageValue,
		};
	}

	function findActiveMentionToken(editor) {
		const selection = window.getSelection();
		if (!selection?.rangeCount || !selection.isCollapsed) return null;
		const caret = selection.getRangeAt(0);
		if (!editor.contains(caret.startContainer)) return null;
		const beforeCaret = document.createRange();
		beforeCaret.selectNodeContents(editor);
		beforeCaret.setEnd(caret.startContainer, caret.startOffset);
		const text = beforeCaret.toString();
		const match = text.match(TOKEN_PATTERN);
		if (!match) return null;
		const query = match[2] || '';
		return { query, start: text.length - query.length - 1, end: text.length };
	}

	function getTextPoint(root, targetOffset) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		let textNode = walker.nextNode();
		let consumed = 0;
		let lastNode = null;
		while (textNode) {
			lastNode = textNode;
			const nextConsumed = consumed + textNode.textContent.length;
			if (targetOffset <= nextConsumed) return { node: textNode, offset: targetOffset - consumed };
			consumed = nextConsumed;
			textNode = walker.nextNode();
		}
		if (lastNode) return { node: lastNode, offset: lastNode.textContent.length };
		const emptyText = document.createTextNode('');
		root.appendChild(emptyText);
		return { node: emptyText, offset: 0 };
	}

	function insertTextAtSelection(editor, text) {
		const selection = window.getSelection();
		if (!selection?.rangeCount || !editor.contains(selection.anchorNode)) return;
		const range = selection.getRangeAt(0);
		range.deleteContents();
		const textNode = document.createTextNode(text);
		range.insertNode(textNode);
		setCaret(textNode, textNode.length);
	}

	function setCaret(node, offset) {
		const range = document.createRange();
		range.setStart(node, offset);
		range.collapse(true);
		const selection = window.getSelection();
		selection.removeAllRanges();
		selection.addRange(range);
	}

	function setCaretAtEnd(editor) {
		const point = getTextPoint(editor, getEditorText(editor).length);
		if (point) setCaret(point.node, point.offset);
	}

	function getEditorText(editor) {
		return String(editor?.textContent || '').replace(/\u00a0/g, ' ');
	}

	function filterMentionUsers(users, query) {
		const normalizedQuery = String(query || '').toLowerCase();
		if (!normalizedQuery) return users;
		return users
			.map((user) => ({ user, rank: getSuggestionRank(user, normalizedQuery) }))
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
			return users.map((user) => ({
				id: user.id || '',
				username: String(user.username || '').trim(),
				displayName: String(user.displayName || user.username || '').trim(),
				avatar: user.avatar || null,
			})).filter((user) => user.id && user.username);
		} catch {
			return [];
		}
	}

	function getInitial(user) {
		return String(user.displayName || user.username || '?').trim().slice(0, 1).toUpperCase();
	}

	window.ChatConversationMessageMentions = { createMentionController };
})();
