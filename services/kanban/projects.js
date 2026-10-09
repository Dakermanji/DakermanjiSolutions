//! services/kanban/projects.js

import pool from '../../config/database.js';
import { archiveProject, createProject } from '../../models/kanban/Projects.js';
import { recordProjectArchived, recordProjectCreated } from './projectEvents.js';

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
		return archived;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
