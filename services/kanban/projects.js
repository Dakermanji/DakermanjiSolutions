//! services/kanban/projects.js

import pool from '../../config/database.js';
import {
	archiveProject,
	createProject,
	permanentlyDeleteArchivedProject as deleteArchivedProject,
	restoreProject,
} from '../../models/kanban/Projects.js';
import {
	recordProjectArchived,
	recordProjectCreated,
	recordProjectRestored,
} from './projectEvents.js';
import { removeKanbanProjectRoom } from './live.js';

export async function createProjectWithLog(input) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const project = await createProject(input, client);
		await recordProjectCreated({
			projectId: project.id,
			ownerUserId: input.ownerUserId,
		}, client);
		await client.query('COMMIT');
		return project;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export async function archiveProjectWithLog(input) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const archived = await archiveProject(input, client);
		if (archived) {
			await recordProjectArchived(input, client);
		}
		await client.query('COMMIT');
		if (archived) await removeKanbanProjectRoom(input.projectId);
		return archived;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export async function restoreProjectWithLog(input) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const restored = await restoreProject(input, client);
		if (restored) {
			await recordProjectRestored(input, client);
		}
		await client.query('COMMIT');
		return restored;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export function permanentlyDeleteArchivedProject(input) {
	return deleteArchivedProject(input, pool);
}
