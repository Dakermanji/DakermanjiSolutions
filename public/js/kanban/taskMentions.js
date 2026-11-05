//! public/js/kanban/taskMentions.js

(() => {
	const TOKEN_PATTERN = /(^|[^a-zA-Z0-9_.-])@([a-zA-Z0-9_.-]{0,20})$/;
	const MAX_VISIBLE_SUGGESTIONS = 8;
	const page = document.querySelector('.kanban-page[data-kanban-mention-members]');
	if (!page) return;

	const members = parseMembers(page.dataset.kanbanMentionMembers);
	document.addEventListener('click', (event) => {
		for (const editor of page.querySelectorAll('[data-kanban-mention-input]')) {
			const form = editor.closest('form');
			const menu = form?.querySelector('[data-kanban-mention-menu]');
			if (form?.contains(event.target) || !menu || menu.hidden) continue;
			menu.hidden = true;
			menu.textContent = '';
			editor.setAttribute('aria-expanded', 'false');
		}
	});

	function initIn(scope = page) {
		for (const editor of scope.querySelectorAll('[data-kanban-mention-input]')) {
			const form = editor.closest('form');
			const menu = form?.querySelector('[data-kanban-mention-menu]');
			const valueField = form?.querySelector('[data-kanban-mention-value]');
			if (!form || !menu || !valueField) continue;

			let activeToken = null;
			let activeIndex = 0;
			let visibleMembers = [];

			editor.addEventListener('input', handleInput);
			editor.addEventListener('keydown', handleKeydown);
			editor.addEventListener('paste', handlePaste);
			editor.addEventListener('blur', () => {
				setTimeout(() => {
					if (!menu.contains(document.activeElement)) hideMenu();
				}, 0);
			});
			form.addEventListener('submit', () => {
				valueField.value = getEditorText(editor);
			});
			function handleInput() {
				enforceMaxLength(editor);
				activeToken = findActiveMentionToken(editor);
				if (!activeToken || members.length === 0) {
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
				if (!menu.hidden) {
					if (event.key === 'Escape') {
						event.preventDefault();
						hideMenu();
						return;
					}
					if (event.key === 'ArrowDown' && visibleMembers.length) {
						event.preventDefault();
						moveActiveMember(1);
						return;
					}
					if (event.key === 'ArrowUp' && visibleMembers.length) {
						event.preventDefault();
						moveActiveMember(-1);
						return;
					}
					if ((event.key === 'Tab' || event.key === 'Enter') && visibleMembers[activeIndex]) {
						event.preventDefault();
						insertMention(visibleMembers[activeIndex]);
						return;
					}
				}

				if (event.key === 'Enter') {
					event.preventDefault();
					insertTextAtSelection(editor, '\n');
					editor.dispatchEvent(new Event('input', { bubbles: true }));
				}
			}

			function handlePaste(event) {
				event.preventDefault();
				const text = event.clipboardData?.getData('text/plain') || '';
				insertTextAtSelection(editor, text);
				editor.dispatchEvent(new Event('input', { bubbles: true }));
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
					option.setAttribute('role', 'option');
					option.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
					option.dir = 'ltr';
					option.textContent = `@${member.username}`;
					option.addEventListener('mousedown', (event) => event.preventDefault());
					option.addEventListener('click', () => insertMention(member));
					menu.appendChild(option);
				});

				menu.hidden = false;
				editor.setAttribute('aria-expanded', 'true');
			}

			function moveActiveMember(offset) {
				activeIndex = (activeIndex + offset + visibleMembers.length) % visibleMembers.length;
				menu.querySelectorAll('[role="option"]').forEach((option, index) => {
					option.setAttribute('aria-selected', index === activeIndex ? 'true' : 'false');
				});
			}

			function insertMention(member) {
				if (!activeToken || !member?.username) return;
				const start = getTextPoint(editor, activeToken.start);
				const end = getTextPoint(editor, activeToken.end);
				if (!start || !end) return;

				const range = document.createRange();
				range.setStart(start.node, start.offset);
				range.setEnd(end.node, end.offset);
				range.deleteContents();

				const mention = document.createElement('span');
				mention.className = 'app-mention';
				mention.dataset.kanbanMentionToken = '';
				mention.dir = 'ltr';
				mention.textContent = `@${member.username}`;
				range.insertNode(mention);

				const space = document.createTextNode(' ');
				mention.parentNode.insertBefore(space, mention.nextSibling);
				setCaret(space, space.length);
				hideMenu();
				editor.focus();
				editor.dispatchEvent(new Event('input', { bubbles: true }));
			}

			function hideMenu() {
				menu.hidden = true;
				menu.textContent = '';
				editor.setAttribute('aria-expanded', 'false');
				activeToken = null;
				activeIndex = 0;
				visibleMembers = [];
			}
		}
	}

	window.KanbanTaskMentions = { initIn };
	initIn();

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
		return {
			query,
			start: text.length - query.length - 1,
			end: text.length,
		};
	}

	function getTextPoint(root, targetOffset) {
		const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
		let textNode = walker.nextNode();
		let consumed = 0;
		let lastNode = null;

		while (textNode) {
			lastNode = textNode;
			const nextConsumed = consumed + textNode.textContent.length;
			if (targetOffset <= nextConsumed) {
				return { node: textNode, offset: targetOffset - consumed };
			}
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

	function getEditorText(editor) {
		return String(editor.textContent || '').replace(/\u00a0/g, ' ');
	}

	function enforceMaxLength(editor) {
		const maxLength = Number(editor.dataset.maxLength);
		const text = getEditorText(editor);
		if (!Number.isFinite(maxLength) || text.length <= maxLength) return;
		editor.textContent = text.slice(0, maxLength);
		setCaretAtEnd(editor);
	}

	function setCaretAtEnd(editor) {
		const lastPoint = getTextPoint(editor, getEditorText(editor).length);
		if (lastPoint) setCaret(lastPoint.node, lastPoint.offset);
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
