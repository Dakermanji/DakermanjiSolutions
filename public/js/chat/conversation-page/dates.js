//! public/js/chat/conversation-page/dates.js

(() => {
	function getMessageDateKey(value) {
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');

		return `${year}-${month}-${day}`;
	}

	function formatMessageDate(value) {
		if (!value) return '';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		}).format(date);
	}

	function formatMessageTime(value) {
		if (!value) return '';

		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return '';

		return new Intl.DateTimeFormat(document.documentElement.lang || 'en', {
			hour: '2-digit',
			minute: '2-digit',
		}).format(date);
	}

	window.ChatConversationDates = {
		formatMessageDate,
		formatMessageTime,
		getMessageDateKey,
	};
})();
