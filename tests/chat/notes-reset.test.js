import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { emitChatNotesReset } from '../../services/chat/live/messages.js';
import { setChatSocketServer } from '../../services/chat/live/state.js';

const source = readFileSync(
	new URL('../../public/js/chat/conversation-page/notesReset.js', import.meta.url),
	'utf8',
);

test('notes reset events go only to the owner’s socket room', () => {
	const events = [];
	setChatSocketServer({
		to: (room) => ({ emit: (name, payload) => events.push({ room, name, payload }) }),
	});
	try {
		emitChatNotesReset('notes-1', 'user-1');
		assert.deepEqual(events, [{
			room: 'chat:user:user-1',
			name: 'chat:notes:reset',
			payload: { conversationId: 'notes-1' },
		}]);
	} finally {
		setChatSocketServer(null);
	}
});

test('another notes tab reloads for its reset while the submitting tab waits for redirect', () => {
	const window = {};
	vm.runInNewContext(source, { window });
	const createHandler = window.ChatConversationNotesReset.createNotesResetHandler;
	let submits;
	let reloads = 0;
	const options = {
		chatPage: { dataset: {
			chatConversationKind: 'self', activeConversationId: 'notes-1',
		} },
		resetForm: { addEventListener: (_name, handler) => { submits = handler; } },
		reload: () => { reloads += 1; },
	};
	const otherTab = createHandler(options);
	otherTab({ conversationId: 'other-notes' });
	otherTab({ conversationId: 'notes-1' });
	assert.equal(reloads, 1);

	const submittingTab = createHandler(options);
	submits();
	submittingTab({ conversationId: 'notes-1' });
	assert.equal(reloads, 1);

	const friendTab = createHandler({
		...options,
		chatPage: { dataset: {
			chatConversationKind: 'friend', activeConversationId: 'notes-1',
		} },
	});
	friendTab({ conversationId: 'notes-1' });
	assert.equal(reloads, 1);
});
