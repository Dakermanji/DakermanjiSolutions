import assert from 'node:assert/strict';
import test from 'node:test';
import { getSocialCounts } from '../../controllers/social/counts.js';
import UserBlocksModel from '../../models/social/Blocks.js';
import UserFollowsModel from '../../models/social/Follows.js';
import UserSocialNotificationsModel from '../../models/social/Notifications.js';
import { createResponse, withStubs } from './helpers.js';

test('counts require a signed-in user', async () => {
	const res = createResponse();
	await getSocialCounts({ user: null }, res, (error) => { throw error; });
	assert.equal(res.statusCode, 401);
	assert.deepEqual(res.body, { ok: false, error: 'auth:error.auth_required' });
});

test('returns each count for the authenticated user', async () => {
	const res = createResponse();
	const calls = [];
	const count = (name, value) => async (userId) => {
		calls.push([name, userId]);
		return value;
	};
	await withStubs([
		[UserFollowsModel, 'countFollowersByFollowee', count('followers', 4)],
		[UserFollowsModel, 'countFolloweesByFollower', count('following', 7)],
		[UserBlocksModel, 'countByBlocker', count('blocked', 2)],
		[UserSocialNotificationsModel, 'countUnhandledByRecipient', count('notifications', 3)],
	], async () => getSocialCounts({ user: { id: 'actor' } }, res, (error) => { throw error; }));
	assert.deepEqual(calls, [
		['followers', 'actor'], ['following', 'actor'],
		['blocked', 'actor'], ['notifications', 'actor'],
	]);
	assert.deepEqual(res.body, {
		ok: true,
		counts: { followers: 4, following: 7, blocked: 2, notifications: 3 },
	});
});
