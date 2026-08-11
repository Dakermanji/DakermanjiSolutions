//! services/chat/live/state.js

let chatSocketServer = null;

export function getChatSocketServer() {
	return chatSocketServer;
}

export function getChatConversationRoom(conversationId) {
	return `chat:conversation:${conversationId}`;
}

export function getChatUserRoom(userId) {
	return `chat:user:${userId}`;
}

/**
 * Register the Socket.IO server used for chat events.
 *
 * @param {import('socket.io').Server} io
 * @returns {void}
 */
export function setChatSocketServer(io) {
	chatSocketServer = io;
}
