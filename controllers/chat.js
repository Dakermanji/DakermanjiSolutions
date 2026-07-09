//! controllers/chat.js

/**
 * Render the chat shell.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @returns {void}
 */
export function renderChat(req, res) {
	res.render('chat/main', {
		titleKey: 'chat:title',
	});
}
