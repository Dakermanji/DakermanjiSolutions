import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { validatePermanentlyDeleteProject } from '../../middlewares/validators/kanban/projects.js';

const PROJECT_ID = 'b2d6c1a8-7f44-4a0e-9d27-6b1f8f11c901';
const OWNER_ID = 'c3e7d2b9-8a55-4b1f-8e38-7c2f9a22d012';
const projectModelSource = readFileSync(
	new URL('../../models/kanban/Projects.js', import.meta.url),
	'utf8',
);

function getExportedFunction(source, functionName) {
	const start = source.indexOf(`export async function ${functionName}`);
	assert.notEqual(start, -1, `${functionName} should be exported`);

	const nextExport = source.indexOf('\nexport ', start + 1);
	return source.slice(start, nextExport === -1 ? source.length : nextExport);
}

test('permanent project deletion validator passes the owner and normalized confirmation name', () => {
	const req = {
		body: {
			projectId: PROJECT_ID,
			confirmationName: '  Ａrchive Ｐroject  ',
		},
		user: { id: OWNER_ID },
	};
	let nextCalled = false;
	const res = {
		sendStatus(status) {
			assert.fail(`Unexpected response status: ${status}`);
		},
	};

	validatePermanentlyDeleteProject(req, res, () => { nextCalled = true; });

	assert.equal(nextCalled, true);
	assert.deepEqual(req.kanbanPermanentDeleteProjectInput, {
		projectId: PROJECT_ID,
		ownerUserId: OWNER_ID,
		confirmationName: 'Archive Project',
	});
});

test('permanent project deletion validator rejects invalid project IDs and anonymous requests', () => {
	for (const [req, expectedStatus] of [
		[{ body: { projectId: 'invalid' }, user: { id: OWNER_ID } }, 404],
		[{ body: { projectId: PROJECT_ID }, user: null }, 401],
	]) {
		let actualStatus = null;
		validatePermanentlyDeleteProject(req, {
			sendStatus(status) { actualStatus = status; },
		}, () => assert.fail('Invalid request must not continue'));
		assert.equal(actualStatus, expectedStatus);
	}
});

test('project restoration query is restricted to its owner and archived projects', () => {
	const restoreProjectSource = getExportedFunction(projectModelSource, 'restoreProject');

	assert.match(restoreProjectSource, /SET archived_at = NULL/);
	assert.match(restoreProjectSource, /WHERE id = \$1 AND owner_user_id = \$2 AND archived_at IS NOT NULL/);
});

test('permanent deletion requires owner, archived state, and exact project-name confirmation', () => {
	const deleteProjectSource = getExportedFunction(
		projectModelSource,
		'permanentlyDeleteArchivedProject',
	);

	assert.match(deleteProjectSource, /owner_user_id = \$2/);
	assert.match(deleteProjectSource, /archived_at IS NOT NULL AND name = \$3/);
	assert.match(deleteProjectSource, /DELETE FROM kanban_projects/);
});

test('permanent deletion removes task, comment-mention, and invitation notifications', () => {
	const deleteProjectSource = getExportedFunction(
		projectModelSource,
		'permanentlyDeleteArchivedProject',
	);

	assert.match(deleteProjectSource, /DELETE FROM app_notifications/);
	assert.match(deleteProjectSource, /kanban_project_invitation/);
	assert.match(deleteProjectSource, /kanban_task_message_mention/);
	assert.match(deleteProjectSource, /entity_type = 'kanban_task'/);
	assert.match(deleteProjectSource, /matching_invitations/);
	assert.match(deleteProjectSource, /matching_tasks/);
	assert.match(deleteProjectSource, /matching_messages/);
});
