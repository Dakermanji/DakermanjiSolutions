//! services/kanban/projects.js

import pool from '../../config/database.js';
import { createProject } from '../../models/kanban/Projects.js';
import { recordProjectCreated } from './projectEvents.js';

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
