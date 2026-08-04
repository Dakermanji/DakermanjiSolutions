//! public/js/chat/main.js

(() => {
	const sections = window.ChatMainSections.createChatSectionsController({
		lazySections: document.querySelectorAll('[data-chat-section-collapse]'),
	});
	const roomSearch = window.ChatMainRoomSearch.createRoomSearchController({
		form: document.querySelector('[data-chat-room-search-form]'),
		results: document.querySelector('[data-chat-room-search-results]'),
		template: document.querySelector('[data-chat-room-search-result-template]'),
	});

	sections.init();
	roomSearch.init();
	window.ChatMainRoomModal.initRoomCreateModalDefaults({
		modal: document.getElementById('chatRoomModal'),
		buttons: document.querySelectorAll('[data-chat-room-visibility]'),
	});

	window.addEventListener('app:chat-unread:changed', (event) => {
		sections.updateUnreadCounts(event.detail?.sections);
	});
})();
