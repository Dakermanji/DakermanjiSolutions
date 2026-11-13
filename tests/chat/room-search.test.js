import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const source = readFileSync(
	new URL('../../public/js/chat/main-page/roomSearch.js', import.meta.url),
	'utf8',
);

function deferred() {
	let resolve;
	const promise = new Promise((done) => { resolve = done; });
	return { promise, resolve };
}

function createPage() {
	const requests = [];
	const errors = [];
	const handlers = {};
	const input = {
		value: '',
		addEventListener: (name, handler) => { handlers[`input:${name}`] = handler; },
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
		},
		querySelector: () => input,
		addEventListener: (name, handler) => { handlers[name] = handler; },
	};
	const document = {
		createElement: () => ({
			children: [],
			append(...children) { this.children.push(...children); },
			appendChild(child) { this.children.push(child); },
			setAttribute() {},
		}),
	};
	const window = {
		location: { origin: 'https://example.test' },
		ChatMainUtils: { submitRoomActionForm() {} },
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
	window.ChatMainRoomSearch.createRoomSearchController({ form, results, template: {} }).init();

	return {
		input, requests, errors, results,
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
