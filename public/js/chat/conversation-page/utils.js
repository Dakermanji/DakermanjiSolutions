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

	function createPluralFormatter(labels, locale = document.documentElement.lang || 'en') {
		const safeLabels =
			labels && typeof labels === 'object' && !Array.isArray(labels)
				? labels
				: { other: String(labels || '{{count}}') };
		const pluralRules = new Intl.PluralRules(locale);

		return function formatPlural(count) {
			const numericCount = Number(count || 0);
			const category = pluralRules.select(numericCount);
			const template =
				safeLabels[category] ||
				safeLabels.other ||
				safeLabels.one ||
				'{{count}}';

			return formatCountLabel(template, numericCount);
		};
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

	function showFlashMessage(message, type = 'danger') {
		if (!message) return;

		const flash = document.createElement('div');
		flash.className = `flash-message alert alert-${type} fade show mb-0`;
		flash.setAttribute('role', 'alert');
		flash.textContent = message;
		document.body.appendChild(flash);

		window.setTimeout(() => {
			flash.classList.remove('show');
			flash.addEventListener(
				'transitionend',
				() => {
					flash.remove();
				},
				{ once: true },
			);
			window.setTimeout(() => {
				flash.remove();
			}, 1000);
		}, 3000);
	}

	window.ChatConversationUtils = {
		emitWithAck,
		createPluralFormatter,
		escapeCssIdentifier,
		formatCountLabel,
		formatDateTime,
		getUserName,
		parseJsonScript,
		setFormControlsDisabled,
		showFlashMessage,
	};
})();
