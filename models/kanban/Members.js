//! models/kanban/Members.js

import { randomUUID } from 'node:crypto';
import pool, { queryRows } from '../../config/database.js';

/**
 * Record the same request for a matching or unmatched identifier. Never return
 * recipient lookup details to the caller. Open requests are reused until their
 * seven-day expiry, including requests the recipient privately declined.
 */
export async function createInvitationRequest({
	projectId,
	ownerUserId,
	identifier,
	role,
}) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const owner = await client.query(
			`SELECT id FROM kanban_projects
			 WHERE id = $1 AND owner_user_id = $2 AND archived_at IS NULL
			 FOR UPDATE`,
			[projectId, ownerUserId],
		);
		if (!owner.rowCount) {
			await client.query('ROLLBACK');
			return false;
		}

		await client.query(
			`UPDATE kanban_project_invitations SET status = 'expired'
			 WHERE project_id = $1 AND requested_identifier = $2
			   AND status IN ('pending', 'declined') AND expires_at <= NOW()`,
			[projectId, identifier],
		);

		const recipient = await client.query(
			`SELECT u.id FROM users u
			 WHERE (u.username_normalized = $1 OR lower(u.email) = $1)
			   AND u.is_verified = TRUE AND u.is_blocked = FALSE
			   AND NOT EXISTS (
			     SELECT 1 FROM kanban_project_members m
			     WHERE m.project_id = $2 AND m.user_id = u.id
			   )
			 LIMIT 1 FOR KEY SHARE OF u`,
			[identifier, projectId],
		);
		await client.query(
			`INSERT INTO kanban_project_invitations
			 (id, project_id, invitee_user_id, inviter_user_id,
			  requested_identifier, role)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 ON CONFLICT (project_id, requested_identifier)
			 WHERE status IN ('pending', 'declined') DO NOTHING`,
			[
				randomUUID(),
				projectId,
				recipient.rows[0]?.id || null,
				ownerUserId,
				identifier,
				role,
			],
		);
		await client.query('COMMIT');
		return true;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export function listInvitationsForUser(userId) {
	return queryRows(
		`SELECT i.id, i.role, i.created_at, i.expires_at,
		        p.name AS project_name
		 FROM kanban_project_invitations i
		 JOIN kanban_projects p ON p.id = i.project_id
		 WHERE i.invitee_user_id = $1 AND i.status = 'pending'
		   AND i.expires_at > NOW() AND p.archived_at IS NULL
		   AND NOT EXISTS (
		     SELECT 1 FROM kanban_project_members m
		     WHERE m.project_id = i.project_id AND m.user_id = $1
		   )
		 ORDER BY i.created_at DESC`,
		[userId],
	);
}

/** The owner sees their submitted input, not recipient or delivery state. */
export function listProjectInvitationRequests(projectId, ownerUserId) {
	return queryRows(
		`SELECT i.id, i.requested_identifier, i.role,
		        i.created_at, i.expires_at
		 FROM kanban_project_invitations i
		 JOIN kanban_projects p ON p.id = i.project_id
		 WHERE i.project_id = $1 AND p.owner_user_id = $2
		   AND p.archived_at IS NULL
		   AND i.status IN ('pending', 'declined')
		   AND i.expires_at > NOW()
		 ORDER BY i.created_at DESC`,
		[projectId, ownerUserId],
	);
}

export async function respondToInvitation({ invitationId, userId, accept }) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const { rows } = await client.query(
			`SELECT i.project_id, i.role
			 FROM kanban_project_invitations i
			 JOIN kanban_projects p ON p.id = i.project_id
			 WHERE i.id = $1 AND i.invitee_user_id = $2
			   AND i.status = 'pending' AND i.expires_at > NOW()
			   AND p.archived_at IS NULL
			 FOR UPDATE OF i`,
			[invitationId, userId],
		);
		const invitation = rows[0];
		if (!invitation) {
			await client.query('ROLLBACK');
			return false;
		}
		if (accept) {
			await client.query(
				`INSERT INTO kanban_project_members (project_id, user_id, role)
				 VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
				[invitation.project_id, userId, invitation.role],
			);
		}
		const response = await client.query(
			`UPDATE kanban_project_invitations
			 SET status = $1, responded_at = NOW()
			 WHERE id = $2 AND status = 'pending' AND expires_at > NOW()`,
			[accept ? 'accepted' : 'declined', invitationId],
		);
		if (!response.rowCount) {
			await client.query('ROLLBACK');
			return false;
		}
		await client.query('COMMIT');
		return true;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export async function cancelInvitationRequest({ invitationId, projectId, ownerUserId }) {
	const rows = await queryRows(
		`UPDATE kanban_project_invitations i
		 SET status = 'cancelled', cancelled_at = NOW()
		 FROM kanban_projects p
		 WHERE i.id = $1 AND i.project_id = $2 AND p.id = i.project_id
		   AND p.owner_user_id = $3 AND p.archived_at IS NULL
		   AND i.status IN ('pending', 'declined')
		   AND i.expires_at > NOW()
		 RETURNING i.id`,
		[invitationId, projectId, ownerUserId],
	);
	return rows.length > 0;
}

export async function changeMemberRole({ projectId, ownerUserId, targetUserId, role }) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const owner = await client.query(
			`SELECT 1 FROM kanban_projects
			 WHERE id = $1 AND owner_user_id = $2 AND archived_at IS NULL
			 FOR UPDATE`,
			[projectId, ownerUserId],
		);
		if (!owner.rowCount || targetUserId === ownerUserId) {
			await client.query('ROLLBACK');
			return false;
		}
		const changed = await client.query(
			`UPDATE kanban_project_members SET role = $1
			 WHERE project_id = $2 AND user_id = $3 AND role <> 'owner'
			 RETURNING user_id`,
			[role, projectId, targetUserId],
		);
		if (!changed.rowCount) {
			await client.query('ROLLBACK');
			return false;
		}
		if (role === 'observer') {
			await client.query(
				`UPDATE kanban_tasks SET assignee_user_id = NULL, updated_at = NOW()
				 WHERE project_id = $1 AND assignee_user_id = $2`,
				[projectId, targetUserId],
			);
		}
		await client.query('COMMIT');
		return true;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

export async function removeMember({ projectId, ownerUserId, targetUserId }) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const owner = await client.query(
			`SELECT 1 FROM kanban_projects
			 WHERE id = $1 AND owner_user_id = $2 AND archived_at IS NULL
			 FOR UPDATE`,
			[projectId, ownerUserId],
		);
		if (!owner.rowCount || targetUserId === ownerUserId) {
			await client.query('ROLLBACK');
			return false;
		}
		const removed = await client.query(
			`DELETE FROM kanban_project_members
			 WHERE project_id = $1 AND user_id = $2 AND role <> 'owner'
			 RETURNING user_id`,
			[projectId, targetUserId],
		);
		if (!removed.rowCount) {
			await client.query('ROLLBACK');
			return false;
		}
		await client.query(
			`UPDATE kanban_tasks SET assignee_user_id = NULL, updated_at = NOW()
			 WHERE project_id = $1 AND assignee_user_id = $2`,
			[projectId, targetUserId],
		);
		await client.query('COMMIT');
		return true;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
