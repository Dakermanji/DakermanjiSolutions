//! controllers/social/followers.js

import UserFollowsModel from '../../models/social/Follows.js';

/**
 * Return users following the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getFollowers(req, res, next) {
	try {
		const followeeId = req.user?.id;

		if (!followeeId) {
			res.status(401).json({
				ok: false,
				error: 'auth:error.auth_required',
			});
			return;
		}

		const followers =
			await UserFollowsModel.findFollowersByFollowee(followeeId);

		res.json({
			ok: true,
			followers: followers.map(serializeFollower),
		});
	} catch (error) {
		next(error);
	}
}

function serializeFollower(follower) {
	const actions = [
		{
			name: follower.is_mutual ? 'unfollow_user' : 'follow_back',
			targetUserId: follower.follower_id,
		},
		follower.is_mutual
			? {
					name: 'remove_follow_relationships',
					targetUserId: follower.follower_id,
				}
			: {
					name: 'remove_follower',
					targetUserId: follower.follower_id,
				},
		{
			name: 'block_user',
			targetUserId: follower.follower_id,
		},
	];

	return {
		id: follower.follower_id,
		username: follower.follower_username,
		email: follower.follower_email,
		is_mutual: follower.is_mutual,
		followed_at: follower.created_at,
		actions,
	};
}
