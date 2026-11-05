//! services/kanban/taskMessages.js

import pool from '../../config/database.js';
import { extractMessageMentionUsernames } from '../chat/messages/mentions.js';
import {
	createTaskMessage,
	listTaskMessages,
	updateOwnTaskMessage,
} from '../../models/kanban/TaskMessages.js';
import { findTaskForMember } from '../../models/kanban/Tasks.js';
import { notifyTaskCommentMentions } from './taskNotifications.js';

async function withTaskMessageTransaction(work) {
	const client = await pool.connect();
	try {
		await client.query('BEGIN');
		const result = await work(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}

function createMessageBodyParts(message) {
	let mentions = message.mentions || [];
	if (typeof mentions === 'string') {
		try {
			mentions = JSON.parse(mentions);
		} catch {
			mentions = [];
		}
	}
	let projectMemberUsernames = message.project_member_usernames || [];
	if (typeof projectMemberUsernames === 'string') {
		try {
			projectMemberUsernames = JSON.parse(projectMemberUsernames);
		} catch {
			projectMemberUsernames = [];
		}
	}
	const usernames = new Set([
		...(Array.isArray(mentions) ? mentions : [])
			.map((mention) => String(mention.username || '').toLowerCase())
			.filter(Boolean),
		...(Array.isArray(projectMemberUsernames) ? projectMemberUsernames : [])
			.map((username) => String(username || '').toLowerCase())
			.filter(Boolean),
	]);
	const body = String(message.body || '');
	const pattern = /(^|[^a-zA-Z0-9_.-])@([a-zA-Z0-9_.-]{3,20})(?=$|[^a-zA-Z0-9_.-])/g;
	const parts = [];
	let cursor = 0;
	let match;

	while ((match = pattern.exec(body))) {
		const prefix = match[1] || '';
		const username = match[2] || '';
		const start = match.index + prefix.length;
		const text = `@${username}`;
		if (start > cursor) parts.push({ text: body.slice(cursor, start) });
		parts.push({ text, isMention: usernames.has(username.toLowerCase()) });
		cursor = start + text.length;
	}
	if (cursor < body.length) parts.push({ text: body.slice(cursor) });
	return parts;
}

export async function listTaskMessagesForMember({ taskId, viewerUserId }) {
	const task = await findTaskForMember(taskId, viewerUserId);
	if (!task) return null;

	const messages = await listTaskMessages({ taskId, viewerUserId });
	return {
		task,
		messages: messages.map((message) => ({
			...message,
			bodyParts: createMessageBodyParts(message),
		})),
	};
}

export async function postTaskMessage({
	taskId,
	authorUserId,
	authorUsername,
	body,
}) {
	const mentionUsernames = extractMessageMentionUsernames(body);
	const task = mentionUsernames.length
		? await findTaskForMember(taskId, authorUserId)
		: null;
	const message = await withTaskMessageTransaction((client) =>
		createTaskMessage({ taskId, authorUserId, body, mentionUsernames }, client),
	);
	if (!message) return { status: 'forbidden', message: null };
	if (task && message.mentionedUserIds?.length) {
		await notifyTaskCommentMentions({
			taskId,
			taskTitle: task.title,
			taskMessageId: message.id,
			actorUserId: authorUserId,
			actorUsername,
			recipientUserIds: message.mentionedUserIds,
		});
	}
	return { status: 'created', message };
}

export async function editOwnTaskComment({
	messageId,
	taskId,
	authorUserId,
	authorUsername,
	body,
}) {
	const mentionUsernames = extractMessageMentionUsernames(body);
	const task = mentionUsernames.length
		? await findTaskForMember(taskId, authorUserId)
		: null;
	const message = await withTaskMessageTransaction((client) =>
		updateOwnTaskMessage({
			messageId,
			taskId,
			authorUserId,
			body,
			mentionUsernames,
		}, client),
	);
	if (!message) return { status: 'not_editable', message: null };
	if (task && message.newlyMentionedUserIds?.length) {
		await notifyTaskCommentMentions({
			taskId,
			taskTitle: task.title,
			taskMessageId: message.id,
			actorUserId: authorUserId,
			actorUsername,
			recipientUserIds: message.newlyMentionedUserIds,
		});
	}
	return { status: 'edited', message };
}
