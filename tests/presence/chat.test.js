import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const sectionsSource = readFileSync(new URL('../../public/js/chat/main-page/sections.js', import.meta.url), 'utf8');
const cardsSource = readFileSync(new URL('../../public/js/chat/main-page/cards.js', import.meta.url), 'utf8');

function setupSections() {
	const handlers = new Map();
	const classes = new Set();
	const calls = [];
	const emitted = [];
	const socketHandlers = new Map();
	const dots = [{ dataset: { chatFriendPresence: 'friend', status: 'offline' }, setAttribute(name, value) { this[name] = value; } }];
	const body = { dataset: { chatSectionBody: 'friends', url: '/chat/friends', unreadLabel: 'Unread', errorLabel: 'Error', presenceLabels: JSON.stringify({ online: 'Available', offline: 'Offline', away: 'Away', busy: 'Busy' }) }, querySelectorAll: () => dots };
	const collapse = {
		dataset: { chatSectionCollapse: 'friends' },
		classList: { contains: (name) => classes.has(name) },
		addEventListener: (event, handler) => handlers.set(event, handler),
	};
	const documentHandlers = new Map();
	const document = {
		visibilityState: 'visible',
		addEventListener: (event, handler) => documentHandlers.set(event, handler),
	};
	const window = {
		io: () => ({ connected: true, on: (name, handler) => socketHandlers.set(name, handler),
			emit: (name, payload, callback) => { emitted.push({ name, payload }); if (callback) callback({ ok: true, statuses: [{ userId: 'friend', status: 'online' }] }); } }),
		ChatMainUtils: { getSectionBody: () => body, renderLoadingState: () => {}, renderMessage: () => {}, sumUnreadCounts: () => 0 },
		ChatMainBadges: { updateConversationUnreadCount() {}, updateSectionCount() {}, updateSectionUnreadCount() {}, updateSectionUnreadCountsFromPayload() {} },
		ChatMainCards: { renderFriendChats: () => calls.push('render'), renderRooms() {} },
	};
	const fetch = async () => {
		calls.push('fetch');
		return { ok: true, json: async () => ({ ok: true, conversations: [] }) };
	};
	vm.runInNewContext(sectionsSource, { window, document, fetch, console, setTimeout, clearTimeout });
	const controller = window.ChatMainSections.createChatSectionsController({ lazySections: [collapse] });
	controller.init();
	return { handlers, classes, calls, emitted, socketHandlers, dots, document, documentHandlers, body };
}

test('Friends fetches on open, watches status changes, and unwatches when hidden', async () => {
	const h = setupSections();
	assert.equal(h.calls.length, 0);
	h.classes.add('show');
	h.handlers.get('shown.bs.collapse')();
	await new Promise((resolve) => setImmediate(resolve));
	assert.deepEqual(h.calls, ['fetch', 'render']);
	assert.equal(h.emitted[0].name, 'presence:watch');
	assert.equal(h.emitted[0].payload.scope, 'chat-friends');
	assert.equal(h.dots[0].dataset.status, 'online');
	h.socketHandlers.get('presence:peer:changed')({ userId: 'friend', status: 'busy' });
	assert.equal(h.dots[0].dataset.status, 'busy');
	h.document.visibilityState = 'hidden';
	h.documentHandlers.get('visibilitychange')();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
	h.document.visibilityState = 'visible';
	h.documentHandlers.get('visibilitychange')();
	await new Promise((resolve) => setImmediate(resolve));
	assert.equal(h.calls.filter((call) => call === 'fetch').length, 2);
	h.classes.delete('show');
	h.handlers.get('hide.bs.collapse')();
	assert.equal(h.emitted.at(-1).name, 'presence:unwatch');
});

test('friend card places an accessible status dot over the avatar', () => {
	class Element {
		constructor(tag) { this.tag = tag; this.children = []; this.dataset = {}; this.style = {}; }
		append(...children) { this.children.push(...children); }
		appendChild(child) { this.children.push(child); }
		setAttribute(name, value) { this[name] = value; }
		replaceChildren(...children) { this.children = children; }
		querySelectorAll() { return []; }
	}
	const window = {
		ChatMainBadges: { createUnreadBadge: () => new Element('badge') },
		ChatMainUtils: { renderEmptyState() {} },
		AppTooltips: { initIn() {}, reset() {} },
	};
	const document = { createElement: (tag) => new Element(tag) };
	vm.runInNewContext(cardsSource, { window, document });
	const section = new Element('section');
	section.dataset = {
		openUrl: '/chat/friends/open', openLabel: 'Open chat', friendFallbackLabel: 'Friend',
		presenceLabels: JSON.stringify({ online: 'Available', offline: 'Offline', away: 'Away', busy: 'Busy' }),
	};
	window.ChatMainCards.renderFriendChats(section, [{ friend: { id: 'friend', username: 'Henry', status: 'busy' }, conversation: { id: 'conversation' } }]);
	const card = section.children[0].children[0].children[1];
	const avatarWrap = card.children[0];
	assert.equal(avatarWrap.children[0].className, 'chat-friend-avatar');
		assert.equal(avatarWrap.children[1].dataset.status, 'busy');
	assert.equal(avatarWrap.children[1].dataset.chatFriendPresence, 'friend');
	assert.equal(avatarWrap.children[1].dataset.bsTitle, 'Busy');
	assert.equal(avatarWrap.children[1]['aria-label'], 'Busy');
});
