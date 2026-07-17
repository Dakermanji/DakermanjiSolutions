//! public/js/root/modals.js

/**
 * Modal state handler
 * -------------------
 * Reads server-rendered modal state and applies it on page load.
 *
 * Responsibilities:
 * - open the correct Bootstrap modal (if any)
 * - optionally activate a specific tab inside the modal
 *
 * Notes:
 * - state is provided via #modalState element (data-modal)
 * - keeps server (flash) and UI behavior in sync after redirects
 */

(() => {
	const stateEl = document.getElementById('modalState');
	if (!stateEl) return; // no modal state → nothing to apply

	const modalName = stateEl.dataset.modal || '';

	/**
	 * Modal definitions
	 *
	 * - id: modal element id
	 * - tab (optional): tab button id to activate
	 */
	const MODALS = {
		signup: { id: 'authModal', tab: 'auth-signup-tab' },
		signin: { id: 'authModal', tab: 'auth-signin-tab' },
		complete_signup_local: { id: 'completeSignUpModal' },
		complete_signup_oauth: { id: 'completeSignUpModal' },
		reset_password: { id: 'resetPasswordModal' },
		profile_password: { id: 'profilePasswordModal' },
		profile_delete_account: { id: 'profileDeleteAccountModal' },
		chat_room: { id: 'chatRoomModal' },
	};

	const target = MODALS[modalName];
	if (!target || !window.bootstrap?.Modal) return;

	const modalEl = document.getElementById(target.id);
	if (!modalEl) return;

	// Open modal
	bootstrap.Modal.getOrCreateInstance(modalEl).show();

	// Activate tab if defined
	if (target.tab && window.bootstrap?.Tab) {
		const tabButton = document.getElementById(target.tab);
		if (tabButton) {
			bootstrap.Tab.getOrCreateInstance(tabButton).show();
		}
	}
})();
