import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	getMessageRedirect,
	getRequestConversationId,
} from '../../controllers/chat/messages/utils.js';

const notesId = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';

test('notes requests use the owner’s resolved conversation when another tab changes the session', () => {
	const req = {
		chatNotesConversationId: notesId,
		session: { chat: { activeConversationId: otherId } },
	};

	assert.equal(getRequestConversationId(req, 'self'), notesId);
	assert.equal(getRequestConversationId(req, 'friend'), otherId);
	assert.equal(getMessageRedirect('self'), '/chat/notes');
	assert.equal(getMessageRedirect('friend'), '/chat?conversation=active');
});

test('notes requests do not fall back to another tab’s active conversation', () => {
	const req = {
		session: { chat: { activeConversationId: otherId } },
	};

	assert.equal(getRequestConversationId(req, 'self'), null);
});
