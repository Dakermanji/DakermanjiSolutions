import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const liveSource = readFileSync(new URL('../../public/js/kanban/live.js', import.meta.url), 'utf8');
const taskSource = readFileSync(new URL('../../public/js/kanban/taskLive.js', import.meta.url), 'utf8');
const taskActivitySource = readFileSync(new URL('../../public/js/kanban/taskActivityLive.js', import.meta.url), 'utf8');
const projectActivitySource = readFileSync(new URL('../../public/js/kanban/projectActivityLive.js', import.meta.url), 'utf8');

const PROJECT_ID = 'b2d6c1a8-7f44-4a0e-9d27-6b1f8f11c901';
const TASK_ID = 'c3e7d2b9-8a55-4b1f-8e38-7c2f9a22d012';

function createSocket() {
	const handlers = new Map();
	return {
		on: (event, handler) => handlers.set(event, handler),
		emit() {},
		disconnect() {},
		send(event, payload) { return handlers.get(event)(payload); },
	};
}

function deferred() {
	let resolve;
	const promise = new Promise((done) => { resolve = done; });
	return { promise, resolve };
}

function response(text, jsonValue) {
	return {
		ok: true,
		text: async () => text,
		json: async () => jsonValue,
	};
}

function createPage(dataset = {}) {
	const current = new Map();
	const page = {
		dataset: { kanbanProjectId: PROJECT_ID, kanbanTaskId: TASK_ID, ...dataset },
		isConnected: true,
		querySelector(selector) { return current.get(selector) || null; },
	};
	return {
		page,
		set(selector, element) { current.set(selector, element); },
	};
}

function fragmentElement(id) {
	return {
		id,
		isConnected: true,
		querySelectorAll: () => [],
		querySelector: () => null,
		replaceWith(replacement) {
			this.isConnected = false;
			replacement.isConnected = true;
			this.onReplace?.(replacement);
		},
	};
}

function runFragmentClient(source, currentSelector, options = {}) {
	const socket = createSocket();
	const { page, set } = createPage(options.dataset);
	let current = fragmentElement('initial');
	set(currentSelector, current);
	const pendingFetches = [];
	const document = {
		querySelector: (selector) => selector.startsWith('.kanban-page[') ? page : null,
		createElement: (tag) => {
			assert.equal(tag, 'template');
			let markup = '';
			const fragment = {
				querySelector: () => fragmentElement(markup),
			};
			return {
				content: fragment,
				set innerHTML(value) { markup = value; },
			};
		},
	};
	const window = {
		io: () => socket,
		addEventListener() {},
		AppSelectDropdown: { initIn() {} },
		KanbanTaskChanges: { initIn() {} },
		AppTooltips: { initIn() {}, reset() {} },
		KanbanTaskMentions: { initIn() {} },
	};
	const fetch = (...args) => {
		const request = deferred();
		pendingFetches.push({ args, ...request });
		return request.promise;
	};
	const events = {
		'kanban:task:edited': { task: { id: TASK_ID, project_id: PROJECT_ID, title: 'Updated' } },
		'kanban:task:comment_created': { taskId: TASK_ID },
	};
	vm.runInNewContext(source, {
		window,
		document,
		fetch,
		console,
		encodeURIComponent,
		Event: class Event {},
	});
	return {
		socket,
		page,
		pendingFetches,
		current: () => current,
		async emitTwice(event = 'kanban:task:edited') {
			const first = socket.send(event, events[event]);
			const second = socket.send(event, events[event]);
			return [first, second];
		},
		installReplacementTracking() {
			current.onReplace = (replacement) => {
				current = replacement;
				set(currentSelector, current);
			};
		},
	};
}

function createCard(taskId) {
	return {
		dataset: { taskId },
		querySelector: () => null,
	};
}

test('uses the server canonical task order after a reorder event', async () => {
	const socket = createSocket();
	const cards = ['task-a', 'task-b', 'task-c'].map(createCard);
	const list = {
		children: cards,
		isConnected: true,
		append(card) {
			const oldIndex = this.children.indexOf(card);
			if (oldIndex !== -1) this.children.splice(oldIndex, 1);
			this.children.push(card);
		},
		querySelector() { return null; },
	};
	const column = { querySelector: () => list };
	const board = { querySelector: () => column };
	const page = {
		dataset: { kanbanProjectId: PROJECT_ID },
		isConnected: true,
		querySelector: () => board,
	};
	const document = {
		querySelector: () => page,
		documentElement: { lang: 'en' },
	};
	const window = {
		io: () => socket,
		addEventListener() {},
		AppTooltips: { reset() {}, initIn() {} },
	};
	const fetch = async (url) => {
		assert.equal(url, `/kanban/${PROJECT_ID}/task-order/in_progress`);
		return response('', { orderedTaskIds: ['task-c', 'task-a', 'task-b'] });
	};
	vm.runInNewContext(liveSource, {
		window,
		document,
		fetch,
		console,
		CSS: { escape: (value) => value },
		encodeURIComponent,
		Intl,
		Map,
		Promise,
	});

	await socket.send('kanban:task:reordered', { status: 'in_progress' });
	await new Promise((resolve) => setTimeout(resolve, 0));

	assert.deepEqual(list.children.map((card) => card.dataset.taskId), ['task-c', 'task-a', 'task-b']);
});

test('ignores an older task detail fragment response', async () => {
	const currentSelector = 'section[aria-labelledby="task-details-title"]';
	const h = runFragmentClient(taskSource, currentSelector);
	h.installReplacementTracking();
	const requests = await h.emitTwice();
	assert.equal(h.pendingFetches.length, 2);
	assert.match(h.pendingFetches[0].args[0], /\/details$/);

	h.pendingFetches[1].resolve(response('newer-details'));
	await requests[1];
	h.pendingFetches[0].resolve(response('older-details'));
	await requests[0];

	assert.equal(h.current().id, 'newer-details');
});

test('ignores an older task activity fragment response', async () => {
	const currentSelector = '.kanban-panel';
	const h = runFragmentClient(taskActivitySource, currentSelector);
	h.installReplacementTracking();
	const requests = await h.emitTwice();
	assert.equal(h.pendingFetches.length, 2);
	assert.match(h.pendingFetches[0].args[0], /\/activity\/events$/);

	h.pendingFetches[1].resolve(response('newer-activity'));
	await requests[1];
	h.pendingFetches[0].resolve(response('older-activity'));
	await requests[0];

	assert.equal(h.current().id, 'newer-activity');
});

test('ignores an older project activity fragment response', async () => {
	const currentSelector = '.kanban-panel';
	const h = runFragmentClient(projectActivitySource, currentSelector, {
		dataset: { kanbanTaskId: undefined },
	});
	h.installReplacementTracking();
	const first = h.socket.send('kanban:project:activity_changed', { projectId: PROJECT_ID });
	const second = h.socket.send('kanban:project:activity_changed', { projectId: PROJECT_ID });
	assert.equal(h.pendingFetches.length, 2);
	assert.match(h.pendingFetches[0].args[0], /\/activity\/events$/);

	h.pendingFetches[1].resolve(response('newer-project-activity'));
	await second;
	h.pendingFetches[0].resolve(response('older-project-activity'));
	await first;

	assert.equal(h.current().id, 'newer-project-activity');
});
