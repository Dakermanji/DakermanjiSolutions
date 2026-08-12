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
	setNotificationSocketServer,
} from '../services/notifications/live.js';
import UserModel from '../models/User.js';

/**
 * Attach Socket.IO to the HTTP server.
 *
 * @param {import('http').Server} server
 * @returns {import('socket.io').Server}
 */
export default function configureSocket(server) {
	const io = new Server(server);

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
		socket.join(getSocialUserRoom(socket.data.userId));
		socket.join(getChatUserRoom(socket.data.userId));
		socket.join(getNotificationUserRoom(socket.data.userId));
		registerChatSocketHandlers(io, socket);
	});

	setSocialSocketServer(io);
	setChatSocketServer(io);
	setNotificationSocketServer(io);

	return io;
}
