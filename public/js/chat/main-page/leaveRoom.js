//! public/js/chat/main-page/leaveRoom.js

(() => {
	function createRoomLeaveController({ modal }) {
		const input = modal?.querySelector('[data-chat-room-leave-input]');
		const name = modal?.querySelector('[data-chat-room-leave-name]');

		function setRoom({ conversationId, roomName }) {
			if (input) input.value = conversationId || '';
			if (name) name.textContent = roomName || '';
		}

		function init() {
			if (!modal || !input) return;

			document.addEventListener('click', (event) => {
				const button = event.target.closest('[data-chat-room-leave-button]');
				if (!button) return;

				setRoom({
					conversationId: button.dataset.conversationId,
					roomName: button.dataset.roomName,
				});
			});
		}

		return { init, setRoom };
	}

	window.ChatMainLeaveRoom = {
		createRoomLeaveController,
	};
})();