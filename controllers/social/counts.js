//! controllers/social/counts.js

import UserBlocksModel from '../../models/social/Blocks.js';
import UserFollowsModel from '../../models/social/Follows.js';
import UserSocialNotificationsModel from '../../models/social/Notifications.js';

/**
 * Return social section counts for the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getSocialCounts(req, res, next) {
	try {
		const userId = req.user?.id;

		if (!userId) {
			res.status(401).json({
				ok: false,
				error: 'auth:error.auth_required',
			});
			return;
		}

		const [followers, following, blocked, notifications] = await Promise.all([
			UserFollowsModel.countFollowersByFollowee(userId),
			UserFollowsModel.countFolloweesByFollower(userId),
			UserBlocksModel.countByBlocker(userId),
			UserSocialNotificationsModel.countUnhandledByRecipient(userId),
		]);

		res.json({
			ok: true,
			counts: {
				followers,
				following,
				blocked,
				notifications,
			},
		});
	} catch (error) {
		next(error);
	}
}
