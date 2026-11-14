import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
	new URL('../../public/js/chat/conversation-page/read-state.js', import.meta.url),
	'utf8',
);

test('Self notes skips read acknowledgments while friend chats still acknowledge visible messages', () => {
	const events = [];
	let listeners = 0;
	let animationFrames = 0;
	const socket = { connected: true };
	const row = {
		dataset: { chatMessageId: 'message-1' },
		getBoundingClientRect: () => ({ top: 20, bottom: 40 }),
	};
	const messageSurface = {
		hidden: false,
		getClientRects: () => [{}],
		getBoundingClientRect: () => ({ top: 0, bottom: 100 }),
		querySelectorAll: () => [row],
	};
	const window = {
		ChatConversationUtils: {
			emitWithAck: async (_socket, eventName, payload) => {
				events.push({ eventName, payload });
				return { ok: true };
			},
		},
		requestAnimationFrame: (callback) => {
			animationFrames += 1;
			callback();
			return animationFrames;
		},
		addEventListener: () => { listeners += 1; },
	};
	const document = {
		visibilityState: 'visible',
		addEventListener: () => { listeners += 1; },
	};
	class MutationObserver {
		constructor() { listeners += 1; }
		observe() {}
	}
	vm.runInNewContext(source, { window, document, MutationObserver, clearTimeout });
	const createController = window.ChatConversationReadState.createReadStateController;
	const options = { messageSurface, getChatSocket: () => socket };

	const notes = createController({
		...options,
		chatPage: { dataset: {
			chatConversationKind: 'self', activeConversationId: 'notes-1',
		} },
	});
	notes.scheduleSync();
	assert.equal(events.length, 0);
	assert.equal(animationFrames, 0);
	assert.equal(listeners, 0);

	const friend = createController({
		...options,
		chatPage: { dataset: {
			chatConversationKind: 'friend', activeConversationId: 'friend-1',
		} },
	});
	friend.scheduleSync();
	assert.equal(events.length, 1);
	assert.equal(events[0].eventName, 'chat:conversation:read');
	assert.equal(events[0].payload.conversationId, 'friend-1');
	assert.equal(events[0].payload.messageId, 'message-1');
	assert.equal(listeners, 4);
});
