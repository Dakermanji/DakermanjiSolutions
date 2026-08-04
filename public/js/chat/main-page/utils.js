//! public/js/chat/main-page/utils.js

(() => {
	function escapeCssIdentifier(value) {
		if (window.CSS?.escape) {
			return window.CSS.escape(value);
		}

		return String(value || '').replace(/["\\]/g, '\\$&');
	}

	function formatCount(count) {
		return new Intl.NumberFormat(
			document.documentElement.lang || 'en',
		).format(Number(count || 0));
	}

	function getSectionBody(sectionId) {
		return document.querySelector(
			`[data-chat-section-body="${escapeCssIdentifier(sectionId)}"]`,
		);
	}

	function sumUnreadCounts(items, getCount) {
		return items.reduce(
			(total, item) => total + Number(getCount(item) || 0),
			0,
		);
	}

	function submitRoomActionForm(conversationId, actionUrl) {
		if (!conversationId) return;

		const form = document.createElement('form');
		form.method = 'POST';
		form.action = actionUrl;
		form.hidden = true;

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'conversationId';
		input.value = conversationId;

		form.appendChild(input);
		document.body.appendChild(form);
		form.submit();
	}

	function renderEmptyState(sectionBody, iconClass, message) {
		sectionBody.replaceChildren();

		const wrapper = document.createElement('div');
		wrapper.className = 'chat-empty-state';

		const icon = document.createElement('i');
		icon.className = `bi ${iconClass}`;
		icon.setAttribute('aria-hidden', 'true');

		const text = document.createElement('p');
		text.textContent = message || '';

		wrapper.append(icon, text);
		sectionBody.appendChild(wrapper);
	}

	function renderMessage(sectionBody, message) {
		sectionBody.replaceChildren();

		const paragraph = document.createElement('p');
		paragraph.className = 'text-body-secondary mb-0';
		paragraph.textContent = message || '';

		sectionBody.appendChild(paragraph);
	}

	function renderLoadingState(sectionBody) {
		sectionBody.replaceChildren();

		const wrapper = document.createElement('div');
		wrapper.className = 'd-flex align-items-center justify-content-center py-3';

		const spinner = document.createElement('div');
		spinner.className = 'spinner-border spinner-border-sm text-primary';
		spinner.setAttribute('role', 'status');

		const label = document.createElement('span');
		label.className = 'visually-hidden';
		label.textContent = sectionBody.dataset.loadingLabel || 'Loading';

		spinner.appendChild(label);
		wrapper.appendChild(spinner);
		sectionBody.appendChild(wrapper);
	}

	window.ChatMainUtils = {
		escapeCssIdentifier,
		formatCount,
		getSectionBody,
		renderEmptyState,
		renderLoadingState,
		renderMessage,
		submitRoomActionForm,
		sumUnreadCounts,
	};
})();
