//! public/js/chat/conversation-page/utils.js

(() => {
	function parseJsonScript(scriptNode) {
		if (!scriptNode?.textContent) return {};

		try {
			return JSON.parse(scriptNode.textContent);
		} catch (error) {
			console.error('Failed to parse chat JSON script', error);
			return {};
		}
	}

	function emitWithAck(socket, eventName, payload) {
		return new Promise((resolve, reject) => {
			socket.timeout(5000).emit(eventName, payload, (error, response) => {
				if (error) {
					reject(error);
					return;
				}

				resolve(response);
			});
		});
	}

	function formatCountLabel(template, count) {
		return String(template || '{{count}}').replace('{{count}}', String(count));
	}

	function escapeCssIdentifier(value) {
		if (window.CSS?.escape) {
			return window.CSS.escape(value);
		}

		return String(value || '').replace(/["\\]/g, '\\$&');
	}

	function getUserName(user) {
		return user?.displayName || user?.username || user?.email || '';
	}

	function formatDateTime(value) {
		if (!value) return '';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
			dateStyle: 'medium',
			timeStyle: 'short',
		}).format(date);
	}

	function setFormControlsDisabled(form, disabled) {
		form
			.querySelectorAll('input, button')
			.forEach((element) => {
				element.disabled = disabled;
			});
	}

	window.ChatConversationUtils = {
		emitWithAck,
		escapeCssIdentifier,
		formatCountLabel,
		formatDateTime,
		getUserName,
		parseJsonScript,
		setFormControlsDisabled,
	};
})();
