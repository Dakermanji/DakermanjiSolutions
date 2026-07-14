//! controllers/social/blocked.js

import UserBlocksModel from '../../models/social/Blocks.js';

/**
 * Return blocked users for the signed-in user.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 * @returns {Promise<void>}
 */
export async function getBlocked(req, res, next) {
	try {
		const blockerId = req.user?.id;

		if (!blockerId) {
			res.status(401).json({
				ok: false,
				error: 'auth:error.auth_required',
			});
			return;
		}

		const blocked = await UserBlocksModel.findByBlocker(blockerId);

		res.json({
			ok: true,
			blocked: blocked.map(serializeBlockedUser),
		});
	} catch (error) {
		next(error);
	}
}

function serializeBlockedUser(blockedUser) {
	return {
		id: blockedUser.blocked_id,
		username: blockedUser.blocked_username,
		email: blockedUser.blocked_email,
		blocked_at: blockedUser.created_at,
		actions: [
			{
				name: 'unblock_user',
				targetUserId: blockedUser.blocked_id,
			},
			{
				name: 'unblock_and_follow_request',
				targetUserId: blockedUser.blocked_id,
			},
		],
	};
}
