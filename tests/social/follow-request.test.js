import assert from 'node:assert/strict';
import test from 'node:test';
import UserModel from '../../models/User.js';
import UserBlocksModel from '../../models/social/Blocks.js';
import UserFollowsModel from '../../models/social/Follows.js';
import UserFollowRequestsModel from '../../models/social/FollowRequests.js';
import UserSocialNotificationsModel from '../../models/social/Notifications.js';
import { followRequest } from '../../controllers/social/followRequest.js';
import { createResponse, withStubs } from './helpers.js';

function createRequest(identifier = 'target') {
	const messages = [];
	return {
		user: { id: 'sender' },
		body: { identifier, identifierType: 'username', returnTo: '/profile', modalOnReturn: 'social' },
		messages,
		flash(type, key) { messages.push([type, key]); },
	};
}

test('creates one request and notification for an eligible target', async () => {
	const req = createRequest();
	const res = createResponse();
	const created = [];
	await withStubs([
		[UserModel, 'findByUsername', async () => ({ id: 'target' })],
		[UserBlocksModel, 'exists', async () => false],
		[UserFollowsModel, 'exists', async () => false],
		[UserFollowRequestsModel, 'findPending', async () => null],
		[UserFollowRequestsModel, 'create', async (value) => { created.push(['request', value]); return { id: 'request-1' }; }],
		[UserSocialNotificationsModel, 'create', async (value) => { created.push(['notification', value]); return { id: 'notification-1' }; }],
	], async () => followRequest(req, res, (error) => { throw error; }));

	assert.deepEqual(created, [
		['request', { requesterId: 'sender', targetId: 'target' }],
		['notification', { recipientId: 'target', actorId: 'sender', type: 'follow_request', followRequestId: 'request-1' }],
	]);
	assert.equal(res.location, '/profile');
	assert.deepEqual(req.messages, [['success', 'social:followRequest.success'], ['modal', 'social']]);
});

test('does not reveal a missing or blocking target', async () => {
	for (const target of [null, { id: 'target' }]) {
		const req = createRequest();
		const res = createResponse();
		let created = false;
		await withStubs([
			[UserModel, 'findByUsername', async () => target],
			[UserBlocksModel, 'exists', async (blockerId) => blockerId === 'target'],
			[UserFollowRequestsModel, 'create', async () => { created = true; }],
		], async () => followRequest(req, res, (error) => { throw error; }));
		assert.equal(created, false);
		assert.equal(res.location, '/profile');
		assert.deepEqual(req.messages, [['success', 'social:followRequest.success'], ['modal', 'social']]);
	}
});

test('reuses an existing pending request without creating another', async () => {
	const req = createRequest();
	const res = createResponse();
	let restored;
	await withStubs([
		[UserModel, 'findByUsername', async () => ({ id: 'target' })],
		[UserBlocksModel, 'exists', async () => false],
		[UserFollowsModel, 'exists', async () => false],
		[UserFollowRequestsModel, 'findPending', async () => ({ id: 'pending-1' })],
		[UserFollowRequestsModel, 'create', async () => assert.fail('Must not create a duplicate request')],
		[UserSocialNotificationsModel, 'ensureFollowRequestNotification', async (value) => { restored = value; }],
	], async () => followRequest(req, res, (error) => { throw error; }));
	assert.deepEqual(restored, { recipientId: 'target', actorId: 'sender', followRequestId: 'pending-1' });
	assert.equal(res.location, '/profile');
});
