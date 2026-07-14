//! controllers/social/followees.js

import UserFollowsModel from '../../models/social/Follows.js';

/**
 * Return users followed by the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getFollowees(req, res, next) {
	try {
		const followerId = req.user?.id;

		if (!followerId) {
			res.status(401).json({
				ok: false,
				error: 'auth:error.auth_required',
			});
			return;
		}

		const followees =
			await UserFollowsModel.findFolloweesByFollower(followerId);

		res.json({
			ok: true,
			followees: followees.map(serializeFollowee),
		});
	} catch (error) {
		next(error);
	}
}

function serializeFollowee(followee) {
	const actions = [
		{
			name: 'unfollow_user',
			targetUserId: followee.followee_id,
		},
		{
			name: 'block_user',
			targetUserId: followee.followee_id,
		},
	];

	if (followee.is_mutual) {
		actions.splice(1, 0, {
			name: 'remove_follow_relationships',
			targetUserId: followee.followee_id,
		});
	}

	return {
		id: followee.followee_id,
		username: followee.followee_username,
		email: followee.followee_email,
		is_mutual: followee.is_mutual,
		followed_at: followee.created_at,
		actions,
	};
}
