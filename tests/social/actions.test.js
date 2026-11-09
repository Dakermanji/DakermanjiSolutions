import assert from 'node:assert/strict';
import test from 'node:test';
import { postSocialAction } from '../../controllers/social/actions.js';
import UserBlocksModel from '../../models/social/Blocks.js';
import UserFollowsModel from '../../models/social/Follows.js';
import UserFollowRequestsModel from '../../models/social/FollowRequests.js';
import UserSocialNotificationsModel from '../../models/social/Notifications.js';
import { getSocialUserRoom, setSocialSocketServer } from '../../services/social/live.js';
import { createResponse, withStubs } from './helpers.js';

test('requires authentication and a known action before touching social state', async () => {
	for (const [user, action, statusCode] of [
		[null, 'block_user', 401],
		[{ id: 'actor' }, 'unknown_action', 400],
	]) {
		const res = createResponse();
		await postSocialAction({ user, body: { action, targetUserId: 'target' } }, res, (error) => { throw error; });
		assert.equal(res.statusCode, statusCode);
		assert.equal(res.body.ok, false);
	}
});

test('a stale or unowned notification cannot change a relationship', async () => {
	const res = createResponse();
	let changed = false;
	await withStubs([
		[UserSocialNotificationsModel, 'findActionableByIdForRecipient', async (id, recipientId) => {
			assert.deepEqual([id, recipientId], ['notification-1', 'actor']);
			return null;
		}],
		[UserBlocksModel, 'create', async () => { changed = true; }],
	], async () => postSocialAction({
		user: { id: 'actor' },
		body: { action: 'block_user', notificationId: 'notification-1', targetUserId: 'spoofed' },
	}, res, (error) => { throw error; }));
	assert.equal(changed, false);
	assert.deepEqual(res.body, { ok: true });
});

test('blocking from a notification uses its owner and trusted target', async () => {
	const calls = [];
	const rooms = [];
	const res = createResponse();
	setSocialSocketServer({ to(room) { rooms.push(room); return { emit() {} }; } });
	try {
		await withStubs([
			[UserSocialNotificationsModel, 'findActionableByIdForRecipient', async () => ({
				type: 'follow_started', actor_id: 'trusted-target',
			})],
			[UserFollowsModel, 'removeBothDirections', async (...args) => { calls.push(['remove follows', ...args]); }],
			[UserBlocksModel, 'create', async (...args) => { calls.push(['block', ...args]); }],
			[UserSocialNotificationsModel, 'markAsReadAndHandled', async (...args) => {
				calls.push(['handle notification', ...args]); return true;
			}],
		], async () => postSocialAction({
			user: { id: 'actor' },
			body: { action: 'block_user', notificationId: 'notification-1', targetUserId: 'spoofed' },
		}, res, (error) => { throw error; }));
	} finally {
		setSocialSocketServer(null);
	}
	assert.deepEqual(calls, [
		['remove follows', 'actor', 'trusted-target'],
		['block', 'actor', 'trusted-target'],
		['handle notification', 'notification-1', 'actor'],
	]);
	assert.deepEqual(rooms, [getSocialUserRoom('actor'), getSocialUserRoom('trusted-target')]);
	assert.deepEqual(res.body, { ok: true });
});

test('accepting a request follows the trusted requester and notifies them', async () => {
	const calls = [];
	const res = createResponse();
	await withStubs([
		[UserSocialNotificationsModel, 'findActionableByIdForRecipient', async () => ({
			type: 'follow_request', requester_id: 'trusted-requester', follow_request_id: 'trusted-request',
		})],
		[UserBlocksModel, 'exists', async () => false],
		[UserFollowRequestsModel, 'accept', async (...args) => { calls.push(['accept', ...args]); return true; }],
		[UserFollowsModel, 'create', async (...args) => { calls.push(['follow', ...args]); return true; }],
		[UserFollowsModel, 'exists', async () => false],
		[UserSocialNotificationsModel, 'markAsReadAndHandled', async (...args) => {
			calls.push(['handle notification', ...args]); return true;
		}],
		[UserSocialNotificationsModel, 'create', async (value) => { calls.push(['notify', value]); return { id: 'reply' }; }],
	], async () => postSocialAction({
		user: { id: 'actor' },
		body: {
			action: 'accept_follow_request', notificationId: 'notification-1',
			targetUserId: 'spoofed', followRequestId: 'spoofed-request',
		},
	}, res, (error) => { throw error; }));
	assert.deepEqual(calls, [
		['accept', 'trusted-request', 'actor'],
		['follow', 'trusted-requester', 'actor'],
		['handle notification', 'notification-1', 'actor'],
		['notify', {
			recipientId: 'trusted-requester', actorId: 'actor', type: 'follow_request_accepted',
			followRequestId: 'trusted-request',
		}],
	]);
	assert.deepEqual(res.body, { ok: true });
});

test('unfollow removes only an existing outgoing relationship', async () => {
	const removed = [];
	const res = createResponse();
	await withStubs([
		[UserFollowsModel, 'exists', async (actorId, targetId) => {
			assert.deepEqual([actorId, targetId], ['actor', 'target']);
			return true;
		}],
		[UserFollowsModel, 'removeOneDirection', async (...args) => { removed.push(args); }],
	], async () => postSocialAction({
		user: { id: 'actor' }, body: { action: 'unfollow_user', targetUserId: 'target' },
	}, res, (error) => { throw error; }));
	assert.deepEqual(removed, [['actor', 'target']]);
	assert.deepEqual(res.body, { ok: true });
});
