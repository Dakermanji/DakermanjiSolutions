import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
	new URL('../../public/js/chat/main-page/sections.js', import.meta.url),
	'utf8',
);

const flush = () => new Promise((resolve) => setImmediate(resolve));

function createPage(responses) {
	const handlers = new Map();
	const calls = [];
	const body = {
		dataset: {
			chatSectionBody: 'publicRooms',
			url: '/chat/rooms/public',
			errorLabel: 'Could not update rooms.',
		},
		children: [],
		replaceChildren(...children) { this.children = children; },
		appendChild(child) { this.children.push(child); },
		querySelector: (selector) => selector === '[data-chat-refresh-error]'
			? body.children.find((child) => child.dataset?.chatRefreshError)
			: null,
	};
	const collapse = {
		dataset: { chatSectionCollapse: 'publicRooms' },
		classList: { contains: (name) => name === 'show' },
		addEventListener: (name, handler) => handlers.set(name, handler),
	};
	const document = {
		addEventListener() {},
		querySelectorAll: () => body.dataset.loaded === 'true' ? [body] : [],
		createElement: () => ({
			dataset: {},
			setAttribute(name, value) { this[name] = value; },
		}),
	};
	const window = {
		ChatMainUtils: {
			getSectionBody: () => body,
			renderLoadingState: () => body.replaceChildren({ kind: 'loading' }),
			renderMessage: (_, message) => body.replaceChildren({ kind: 'error', textContent: message }),
			sumUnreadCounts: () => 0,
		},
		ChatMainBadges: {
			updateConversationUnreadCount() {},
			updateSectionCount() {},
			updateSectionUnreadCount() {},
			updateSectionUnreadCountsFromPayload() {},
		},
		ChatMainCards: {
			renderFriendChats() {},
			renderRooms: () => body.replaceChildren({ kind: 'cards' }),
		},
	};
	const fetch = async () => {
		calls.push('fetch');
		return responses.shift();
	};
	vm.runInNewContext(source, {
		window, document, fetch,
		console: { error() {} },
		setTimeout: (callback) => callback(),
		clearTimeout() {},
	});
	const controller = window.ChatMainSections.createChatSectionsController({ lazySections: [collapse] });
	controller.init();
	return { body, calls, handlers, controller };
}

test('a failed room refresh keeps cards and retries when the section reopens', async () => {
	const success = () => ({ ok: true, json: async () => ({ ok: true, rooms: [] }) });
	const page = createPage([success(), { ok: false, status: 503 }, success()]);
	await flush();
	assert.equal(page.body.children[0].kind, 'cards');

	page.controller.updateUnreadCounts({ publicRooms: 1 });
	await flush();
	assert.equal(page.body.children[0].kind, 'cards');
	assert.equal(page.body.children[1].textContent, 'Could not update rooms.');
	assert.equal(page.body.children[1].role, 'alert');
	assert.equal(page.body.dataset.refreshFailed, 'true');

	page.handlers.get('show.bs.collapse')();
	await flush();
	assert.equal(page.calls.length, 3);
	assert.equal(page.body.children.length, 1);
	assert.equal(page.body.children[0].kind, 'cards');
	assert.equal(page.body.dataset.refreshFailed, undefined);
});
