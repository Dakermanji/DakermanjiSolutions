//! services/kanban/memberManagement.js

import pool from '../../config/database.js';
import {
	createProjectEvent,
} from '../../models/kanban/ProjectEvents.js';
import {
	deleteProjectMember,
	findMembershipChangeProject,
	findProjectMemberForRemoval,
	listProjectManagerUserIds,
	unassignTasksForMember,
} from '../../models/kanban/Members.js';
import { removeKanbanMemberFromProjectRoom } from './live.js';
import { notifyTasksUnassignedAfterMemberChange } from './taskNotifications.js';

export function removeProjectMember({ projectId, ownerUserId, targetUserId }) {
	return changeProjectMembership({
		projectId,
		actorUserId: ownerUserId,
		targetUserId,
		action: 'member_removed',
	});
}

export function leaveKanbanProject({ projectId, userId }) {
	return changeProjectMembership({
		projectId,
		actorUserId: userId,
		targetUserId: userId,
		action: 'member_left',
	});
}

async function changeProjectMembership({
	projectId,
	actorUserId,
	targetUserId,
	action,
}) {
	const client = await pool.connect();
	let result;
	try {
		await client.query('BEGIN');
		const projectResult = await findMembershipChangeProject(projectId, client);
		const project = projectResult.rows[0];
		if (!project) {
			await client.query('ROLLBACK');
			return { status: 'unavailable' };
		}
		if (action === 'member_removed' && project.owner_user_id !== actorUserId) {
			await client.query('ROLLBACK');
			return { status: 'forbidden' };
		}
		if (project.owner_user_id === targetUserId) {
			await client.query('ROLLBACK');
			return { status: 'owner_cannot_leave' };
		}

		const membershipResult = await findProjectMemberForRemoval(
			projectId,
			targetUserId,
			client,
		);
		const membership = membershipResult.rows[0];
		if (!membership) {
			await client.query('ROLLBACK');
			return { status: 'not_member' };
		}

		await deleteProjectMember(projectId, targetUserId, client);
		const unassignedResult = await unassignTasksForMember(
			projectId,
			targetUserId,
			client,
		);
		const managersResult = await listProjectManagerUserIds(projectId, client);
		await createProjectEvent({
			projectId,
			actorUserId,
			action,
			details: { memberUserId: targetUserId, role: membership.role },
		}, client);
		await client.query('COMMIT');
		result = {
			status: action === 'member_left' ? 'left' : 'removed',
			notificationRecipientUserIds: managersResult.rows.map((row) => row.user_id),
			unassignedTasks: unassignedResult.rows,
		};
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}

	removeKanbanMemberFromProjectRoom(projectId, targetUserId);
	if (result.unassignedTasks.length) {
		await notifyTasksUnassignedAfterMemberChange({
			actorUserId,
			recipientUserIds: result.notificationRecipientUserIds,
			tasks: result.unassignedTasks,
		});
	}
	return result;
}
