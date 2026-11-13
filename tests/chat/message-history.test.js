import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
	new URL('../../public/js/chat/conversation-page/messages-history.js', import.meta.url),
	'utf8',
);

test('filling message history stops after a failed request and allows a later retry', async () => {
	let requests = 0;
	let prepends = 0;
	const chatPage = {
		dataset: {
			hasOlderMessages: 'true',
			olderMessagesUrl: '/chat/messages/older',
			currentUserId: 'user-1',
		},
	};
	const messageSurface = {
		scrollHeight: 100,
		clientHeight: 200,
		classList: { add() {}, remove() {} },
		querySelector: () => ({ dataset: { chatMessageId: 'oldest-1' } }),
	};
	const window = { ChatConversationUtils: { escapeCssIdentifier: (value) => value } };
	const errors = [];
	const fetch = async () => {
		requests += 1;
		if (requests === 1) return { ok: false, status: 503 };
		return {
			ok: true,
			json: async () => ({ ok: true, messages: [{ id: 'older-1' }], hasMore: false }),
		};
	};
	vm.runInNewContext(source, {
		window, fetch, URLSearchParams,
		console: { error: (...args) => errors.push(args) },
	});
	const history = window.ChatConversationMessageHistory.createHistoryController({
		chatPage,
		messageSurface,
		messageRenderer: { prependMessages: () => { prepends += 1; } },
		getRendererOptions: () => ({}),
		scheduleVisibleMessageMutationExpiries() {},
	});

	await history.fillScrollableHistory();
	assert.equal(requests, 1);
	assert.equal(prepends, 0);
	assert.equal(errors.length, 1);
	assert.equal(chatPage.dataset.hasOlderMessages, 'true');

	assert.equal(await history.loadOlderMessages(), true);
	assert.equal(requests, 2);
	assert.equal(prepends, 1);
	assert.equal(chatPage.dataset.hasOlderMessages, 'false');
});
