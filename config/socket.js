//! config/socket.js

import { Server } from 'socket.io';
import { sessionMiddleware } from '../middlewares/session.js';
import {
	getSocialUserRoom,
	setSocialSocketServer,
} from '../services/social/live.js';
import {
	getChatUserRoom,
	registerChatSocketHandlers,
	setChatSocketServer,
} from '../services/chat/live.js';
import {
	getNotificationUserRoom,
	registerNotificationSocketHandlers,
	setNotificationSocketServer,
} from '../services/notifications/live.js';
import UserModel from '../models/User.js';
import { createPresenceSocketService } from '../services/presence/live.js';
import { createPresenceWatchService } from '../services/presence/watch.js';
import { resolvePresenceAudience } from '../services/presence/audience.js';
import logger from './logger.js';

/**
 * Attach Socket.IO to the HTTP server.
 *
 * @param {import('http').Server} server
 * @returns {import('socket.io').Server}
 */
export default function configureSocket(server) {
	const io = new Server(server);
	const watchers = createPresenceWatchService({
		resolveAudience: resolvePresenceAudience,
		onError: (error, userId) => logger.warning('Presence audience lookup failed', { type: 'presence', userId, error }),
	});
	const presence = createPresenceSocketService(io, {
		publishPeers: watchers.publish,
		loadPreference: UserModel.findPresencePreference,
		savePreference: UserModel.updatePresencePreference,
		onError: (error, userId) => logger.warning('Presence preference synchronization failed', { type: 'presence', userId, error }),
	});
	server.once('close', presence.stop);

	io.engine.use(sessionMiddleware);

	io.use(async (socket, next) => {
		const userId = socket.request.session?.passport?.user;

		if (!userId) {
			return next(new Error('Unauthorized'));
		}

		try {
			const user = await UserModel.findByIdForSession(userId);

			if (!user) {
				return next(new Error('Unauthorized'));
			}

			socket.data.userId = user.id;
			socket.data.userDisplayName = user.username || user.email || '';
			return next();
		} catch (error) {
			return next(error);
		}
	});

	io.on('connection', (socket) => {
		watchers.register(socket);
		presence.register(socket);
		socket.join(getSocialUserRoom(socket.data.userId));
		socket.join(getChatUserRoom(socket.data.userId));
		socket.join(getNotificationUserRoom(socket.data.userId));
		registerNotificationSocketHandlers(socket);
		registerChatSocketHandlers(io, socket);
	});

	setSocialSocketServer(io);
	setChatSocketServer(io);
	setNotificationSocketServer(io);

	return io;
}
