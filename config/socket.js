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

/**
 * Attach Socket.IO to the HTTP server.
 *
 * @param {import('http').Server} server
 * @returns {import('socket.io').Server}
 */
export default function configureSocket(server) {
	const io = new Server(server);

	io.engine.use(sessionMiddleware);

	io.use((socket, next) => {
		const userId = socket.request.session?.passport?.user;

		if (!userId) {
			return next(new Error('Unauthorized'));
		}

		socket.data.userId = userId;
		return next();
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
