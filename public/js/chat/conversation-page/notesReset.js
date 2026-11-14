//! public/js/chat/conversation-page/notesReset.js

(() => {
	function createNotesResetHandler({ chatPage, resetForm, reload }) {
		let isSubmittingReset = false;

		resetForm?.addEventListener('submit', () => {
			isSubmittingReset = true;
		});

		return (payload) => {
			if (
				isSubmittingReset ||
				chatPage?.dataset.chatConversationKind !== 'self' ||
				payload?.conversationId !== chatPage.dataset.activeConversationId
			) {
				return;
			}

			reload();
		};
	}

	window.ChatConversationNotesReset = { createNotesResetHandler };
})();
