import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
	new URL('../../public/js/chat/conversation-page/messages.js', import.meta.url),
	'utf8',
);

test('socket timeout sends the same message ID through the HTTP fallback', async () => {
	const sent = [];
	const clientMessageId = { value: '' };
	let submittedId = null;
	const composer = {
		dataset: {},
		elements: { clientMessageId, replyToMessageId: { value: '' } },
		submit() { submittedId = clientMessageId.value; },
	};
	const window = {
		crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
		AppCsrf: { addToForm() {} },
		ChatConversationUtils: {
			emitWithAck: async (_socket, _event, payload) => {
				sent.push(payload);
					assert.equal(composer.dataset.chatMessageSubmitting, 'socket');
				throw new Error('ack timed out');
			},
			escapeCssIdentifier: (value) => value,
			setFormControlsDisabled() {},
			showFlashMessage() {},
		},
	};
	const emptyController = () => ({});
	window.ChatConversationMessageFlags = { createFlagController: emptyController };
	window.ChatConversationMessageHistory = { createHistoryController: emptyController };
	window.ChatConversationMessageMutations = { createMutationController: emptyController };
	window.ChatConversationMessageReactions = { createReactionController: emptyController };
	window.ChatConversationMessageReply = { createReplyController: emptyController };
	window.ChatConversationMessageMentions = {
		createMentionController: () => ({
			getMessageText: () => 'hello',
			syncMessageValue() {},
		}),
	};
	vm.runInNewContext(source, { window, console: { error() {} } });
	const messages = window.ChatConversationMessages.createMessageController({
		chatPage: { dataset: { activeConversationId: 'conversation-1' } },
		composer,
		messageRenderer: {},
		messageSurface: {},
		focusComposerInput() {},
		hideTypingIndicator() {},
		getChatSocket: () => ({}),
	});

	await messages.submitLiveMessage({});
	assert.equal(sent.length, 1);
	assert.equal(sent[0].clientMessageId, submittedId);
	assert.equal(submittedId, '00000000-0000-4000-8000-000000000001');
	assert.equal(composer.dataset.chatMessageSubmitting, 'http');
});
