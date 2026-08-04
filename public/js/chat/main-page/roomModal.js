//! public/js/chat/main-page/roomModal.js

(() => {
	const { escapeCssIdentifier } = window.ChatMainUtils;

	function initRoomCreateModalDefaults({ modal, buttons }) {
		if (!modal || buttons.length === 0) return;

		for (const button of buttons) {
			button.addEventListener('click', () => {
				const visibility = button.dataset.chatRoomVisibility || '';
				const visibilityInput = modal.querySelector(
					`input[name="visibility"][value="${escapeCssIdentifier(visibility)}"]`,
				);

				if (visibilityInput) {
					visibilityInput.checked = true;
				}
			});
		}
	}

	window.ChatMainRoomModal = {
		initRoomCreateModalDefaults,
	};
})();
