//! controllers/chat/session.js

export function setActiveChatConversation(req, conversationId) {
	req.session.chat = {
		...(req.session.chat || {}),
		activeConversationId: conversationId,
	};
}

export function clearActiveChatConversation(req) {
	req.session.chat = {
		...(req.session.chat || {}),
		activeConversationId: null,
	};
}

export function consumeActiveChatConversation(req) {
	const activeConversationId = req.session.chat?.activeConversationId || null;
	const shouldOpenActiveConversation = req.query?.conversation === 'active';

	if (!shouldOpenActiveConversation) {
		clearActiveChatConversation(req);
		return null;
	}

	return activeConversationId;
}
