import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
	new URL('../../public/js/chat/main-page/roomSearch.js', import.meta.url),
	'utf8',
);
const utilsSource = readFileSync(
	new URL('../../public/js/chat/main-page/utils.js', import.meta.url),
	'utf8',
);

function createElement(tag) {
	return {
		tag,
		children: [],
		attributes: {},
		listeners: {},
		classList: { values: [], add(value) { this.values.push(value); } },
		append(...children) { this.children.push(...children); },
		appendChild(child) { this.children.push(child); },
		setAttribute(name, value) { this.attributes[name] = value; },
		addEventListener(name, handler) { this.listeners[name] = handler; },
	};
}

function createResultFragment() {
	const selectors = [
		'.chat-room-search-result',
		'[data-room-type-icon]',
		'[data-room-title]',
		'[data-room-description]',
		'[data-room-keywords]',
		'[data-room-owner]',
		'[data-room-action]',
	];
	const nodes = new Map(selectors.map((selector) => [selector, createElement('div')]));
	const result = nodes.get('.chat-room-search-result');
	result.nodes = nodes;
	return { querySelector: (selector) => nodes.get(selector) };
}

function deferred() {
	let resolve;
	const promise = new Promise((done) => { resolve = done; });
	return { promise, resolve };
}

function createPage() {
	const requests = [];
	const actions = [];
	const errors = [];
	const handlers = {};
	const modalHandlers = {};
	let focusCount = 0;
	const input = {
		value: '',
		focus: () => { focusCount += 1; },
		addEventListener: (name, handler) => { handlers[`input:${name}`] = handler; },
	};
	const modal = {
		addEventListener: (name, handler) => { modalHandlers[name] = handler; },
	};
	const results = {
		children: [],
		replaceChildren(...children) { this.children = children; },
		appendChild(child) { this.children.push(child); },
	};
	const form = {
		dataset: {
			url: '/chat/rooms/search',
			emptyLabel: 'No rooms found.',
			errorLabel: 'Search failed.',
			promptLabel: 'Search for a room.',
			openLabel: 'Open',
			joinLabel: 'Join',
			requestLabel: 'Request',
			pendingLabel: 'Pending',
			openUrl: '/chat/rooms/open',
			joinUrl: '/chat/rooms/join',
			requestUrl: '/chat/rooms/request',
		},
		querySelector: () => input,
		closest: () => modal,
		addEventListener: (name, handler) => { handlers[name] = handler; },
	};
	const document = {
		createElement,
	};
	const window = {
		location: { origin: 'https://example.test' },
		ChatMainUtils: {
			submitRoomActionForm: (conversationId, url) => actions.push({ conversationId, url }),
		},
	};
	const fetch = (url, options) => {
		const response = deferred();
		requests.push({ url, options, response });
		return response.promise;
	};

	vm.runInNewContext(source, {
		window, document, fetch, URL, AbortController,
		console: { error: (...args) => errors.push(args) },
	});
	const template = { content: { cloneNode: createResultFragment } };
	window.ChatMainRoomSearch.createRoomSearchController({ form, results, template }).init();

	return {
		input, requests, errors, results, actions,
		openModal: () => modalHandlers['shown.bs.modal'](),
		getFocusCount: () => focusCount,
		submit(query) {
			input.value = query;
			handlers.submit({ preventDefault() {} });
		},
		type(query) {
			input.value = query;
			handlers['input:input']();
		},
		message: () => results.children[0]?.children[1]?.textContent,
	};
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

test('opening the room search modal focuses its query input', () => {
	const page = createPage();
	assert.equal(page.getFocusCount(), 0);
	page.openModal();
	assert.equal(page.getFocusCount(), 1);
});

test('a late response cannot replace newer room search results', async () => {
	const page = createPage();
	page.submit('old');
	page.submit('new');

	assert.equal(page.requests[0].options.signal.aborted, true);
	assert.equal(page.requests[1].url.searchParams.get('q'), 'new');

	page.requests[1].response.resolve({ ok: true, json: async () => ({ ok: true, rooms: [] }) });
	await flush();
	assert.equal(page.message(), 'No rooms found.');

	page.requests[0].response.resolve({ ok: false, status: 503 });
	await flush();
	assert.equal(page.message(), 'No rooms found.');
	assert.equal(page.errors.length, 0);
});

test('a cancelled search cannot render after its JSON finishes', async () => {
	const page = createPage();
	const oldJson = deferred();
	page.submit('old');
	page.requests[0].response.resolve({ ok: true, json: () => oldJson.promise });
	await flush();

	page.submit('new');
	page.requests[1].response.resolve({ ok: true, json: async () => ({ ok: true, rooms: [] }) });
	await flush();
	oldJson.resolve({ ok: false });
	await flush();

	assert.equal(page.message(), 'No rooms found.');
	assert.equal(page.errors.length, 0);
});

test('clearing the query cancels the pending search', async () => {
	const page = createPage();
	page.submit('old');
	page.submit('');
	page.requests[0].response.resolve({ ok: false, status: 503 });
	await flush();

	assert.equal(page.requests[0].options.signal.aborted, true);
	assert.equal(page.message(), 'No rooms found.');
	assert.equal(page.errors.length, 0);
});

test('editing the query cancels pending results and clears the spinner', async () => {
	const page = createPage();
	page.submit('old');
	page.type('new');
	page.requests[0].response.resolve({ ok: true, json: async () => ({ ok: true, rooms: [] }) });
	await flush();

	assert.equal(page.requests[0].options.signal.aborted, true);
	assert.equal(page.message(), 'Search for a room.');
});

test('the latest failed search still shows its error', async () => {
	const page = createPage();
	page.submit('failed');
	page.requests[0].response.resolve({ ok: false, status: 503 });
	await flush();

	assert.equal(page.message(), 'Search failed.');
	assert.equal(page.errors.length, 1);
});

test('room results wire open, join, and request actions while pending stays disabled', async () => {
	const page = createPage();
	page.submit('room');
	page.requests[0].response.resolve({
		ok: true,
		json: async () => ({
			ok: true,
			rooms: ['open', 'join', 'request', 'pending'].map((action) => ({
				room: { conversationId: action, title: action, action, visibility: 'public' },
			})),
		}),
	});
	await flush();

	assert.equal(page.results.children.length, 4);
	for (const [index, action] of ['open', 'join', 'request', 'pending'].entries()) {
		const result = page.results.children[index];
		const button = result.nodes.get('[data-room-action]');
		assert.equal(result.nodes.get('[data-room-title]').textContent, action);
		assert.equal(button.attributes['aria-label'], action[0].toUpperCase() + action.slice(1));
		button.listeners.click?.();
		if (action === 'pending') {
			assert.equal(button.attributes['aria-disabled'], 'true');
			assert.deepEqual(button.classList.values, ['is-disabled']);
		}
	}
	assert.deepEqual(page.actions, [
		{ conversationId: 'open', url: '/chat/rooms/open' },
		{ conversationId: 'join', url: '/chat/rooms/join' },
		{ conversationId: 'request', url: '/chat/rooms/request' },
	]);
});

test('room action forms add CSRF before submitting', () => {
	const calls = [];
	const forms = [];
	const document = {
		createElement: (tag) => {
			const element = createElement(tag);
			if (tag === 'form') {
				element.submit = () => calls.push('submit');
				forms.push(element);
			}
			return element;
		},
		body: { appendChild: () => calls.push('append') },
	};
	const window = {
		AppCsrf: { addToForm: () => calls.push('csrf') },
	};
	vm.runInNewContext(utilsSource, { window, document });
	window.ChatMainUtils.submitRoomActionForm('room-id', '/chat/rooms/join');

	assert.deepEqual(calls, ['append', 'csrf', 'submit']);
	assert.equal(forms[0].method, 'POST');
	assert.equal(forms[0].action, '/chat/rooms/join');
	assert.equal(forms[0].children[0].name, 'conversationId');
	assert.equal(forms[0].children[0].value, 'room-id');
});
