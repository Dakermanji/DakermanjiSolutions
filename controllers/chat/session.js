//! controllers/chat/session.js

export function setActiveChatConversation(req, conversationId) {
	req.session.chat = {
		...(req.session.chat || {}),
		activeConversationId: conversationId,
	};
}

export function setFocusedChatMessage(req, messageId) {
	req.session.chat = {
		...(req.session.chat || {}),
		focusMessageId: messageId,
	};
}

export function clearActiveChatConversation(req) {
	req.session.chat = {
		...(req.session.chat || {}),
		activeConversationId: null,
		focusMessageId: null,
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

export function consumeFocusedChatMessage(req) {
	const focusMessageId = req.session.chat?.focusMessageId || null;

	req.session.chat = {
		...(req.session.chat || {}),
		focusMessageId: null,
	};

	return focusMessageId;
}
