import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { emitChatNotesReset } from '../../services/chat/live/messages.js';
import { setChatSocketServer } from '../../services/chat/live/state.js';
import { getNotesMessageStatus } from '../../controllers/chat/notes.js';
import ChatMessagesModel from '../../models/chat/Messages.js';

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

test('notes status checks only the signed-in user’s resolved conversation', async () => {
	const messageId = '00000000-0000-4000-8000-000000000001';
	const conversationId = '00000000-0000-4000-8000-000000000002';
	const originalFind = ChatMessagesModel.findConversationMessageById;
	let lookup;
	ChatMessagesModel.findConversationMessageById = async (options) => {
		lookup = options;
		return null;
	};
	const response = {
		set: (name, value) => { response.headers[name] = value; return response; },
		json: (value) => { response.body = value; return response; },
		status: (value) => { response.statusCode = value; return response; },
		headers: {},
	};
	try {
		await getNotesMessageStatus({
			query: { messageId },
			chatNotesConversationId: conversationId,
			user: { id: 'owner-1' },
		}, response, (error) => { throw error; });
		assert.deepEqual(lookup, {
			conversationId,
			messageId,
			viewerUserId: 'owner-1',
		});
		assert.deepEqual(response.body, { ok: true, exists: false });
		assert.equal(response.headers['Cache-Control'], 'no-store');
	} finally {
		ChatMessagesModel.findConversationMessageById = originalFind;
	}
});

test('another notes tab reloads for its reset while the submitting tab waits for redirect', () => {
	const window = {};
	vm.runInNewContext(source, { window });
	const createController = window.ChatConversationNotesReset.createNotesResetController;
	let submits;
	let reloads = 0;
	const options = {
		chatPage: { dataset: {
			chatConversationKind: 'self', activeConversationId: 'notes-1',
		} },
		messageSurface: { querySelector: () => null },
		resetForm: { addEventListener: (_name, handler) => { submits = handler; } },
		reload: () => { reloads += 1; },
	};
	const otherTab = createController(options);
	otherTab.handleReset({ conversationId: 'other-notes' });
	otherTab.handleReset({ conversationId: 'notes-1' });
	assert.equal(reloads, 1);

	const submittingTab = createController(options);
	submits();
	submittingTab.handleReset({ conversationId: 'notes-1' });
	assert.equal(reloads, 1);

	const friendTab = createController({
		...options,
		chatPage: { dataset: {
			chatConversationKind: 'friend', activeConversationId: 'notes-1',
		} },
	});
	assert.equal(friendTab, null);
	assert.equal(reloads, 1);
});

test('a reset reload restores the unsent notes draft once', () => {
	const saved = new Map();
	const sessionStorage = {
		getItem: (key) => saved.get(key) ?? null,
		setItem: (key, value) => saved.set(key, value),
		removeItem: (key) => saved.delete(key),
	};
	const window = { sessionStorage };
	vm.runInNewContext(source, { window });
	const createController = window.ChatConversationNotesReset.createNotesResetController;
	const chatPage = { dataset: {
		chatConversationKind: 'self',
		activeConversationId: 'notes-1',
		currentUserId: 'user-1',
	} };
	let editor = {
		textContent: 'A draft with\u00a0spaces',
		getAttribute: () => null,
	};
	let valueField = { value: '' };
	const composer = { querySelector: (selector) =>
		selector === '[data-chat-message-editor]' ? editor : valueField };
	let reloads = 0;
	const options = {
		chatPage,
		composer,
		messageSurface: { querySelector: () => null },
		reload: () => { reloads += 1; },
	};

	createController(options).handleReset({ conversationId: 'notes-1' });
	assert.equal(reloads, 1);
	assert.equal(saved.size, 1);

	editor = { textContent: '', getAttribute: () => null };
	valueField = { value: '' };
	const reloadedPage = createController(options);
	reloadedPage.restoreDraft();
	assert.equal(editor.textContent, 'A draft with spaces');
	assert.equal(valueField.value, 'A draft with spaces');
	assert.equal(saved.size, 0);

	editor = { textContent: '', getAttribute: () => null };
	createController(options).restoreDraft();
	assert.equal(editor.textContent, '');
});

test('a connected notes tab reloads when its displayed note was deleted during disconnection', async () => {
	const window = {};
	const messageId = '00000000-0000-4000-8000-000000000001';
	const row = { dataset: { chatMessageId: messageId } };
	const requests = [];
	vm.runInNewContext(source, {
		window,
		URLSearchParams,
		fetch: async (url, options) => {
			requests.push({ url, options });
			return { ok: true, json: async () => ({ ok: true, exists: false }) };
		},
	});
	let reloads = 0;
	const controller = window.ChatConversationNotesReset.createNotesResetController({
		chatPage: { dataset: {
			chatConversationKind: 'self', activeConversationId: 'notes-1',
		} },
		messageSurface: { querySelector: () => row },
		reload: () => { reloads += 1; },
	});

	await controller.checkForMissedReset();
	await controller.checkForMissedReset();
	assert.equal(reloads, 1);
	assert.equal(requests.length, 1);
	assert.match(requests[0].url, /\/chat\/notes\/message-status\?messageId=/);
	assert.equal(requests[0].options.cache, 'no-store');
});

test('notes check keeps the page when the displayed note still exists', async () => {
	const window = {};
	vm.runInNewContext(source, {
		window,
		URLSearchParams,
		fetch: async () => ({
			ok: true,
			json: async () => ({ ok: true, exists: true }),
		}),
	});
	let reloads = 0;
	const controller = window.ChatConversationNotesReset.createNotesResetController({
		chatPage: { dataset: { chatConversationKind: 'self' } },
		messageSurface: { querySelector: () => ({ dataset: { chatMessageId: 'note-1' } }) },
		reload: () => { reloads += 1; },
	});
	await controller.checkForMissedReset();
	assert.equal(reloads, 0);
});
