//! public/js/root/install.js
// Offer installation only when the browser supplies an install prompt.
(() => {
	let pendingPrompt = null;
	const standalone = window.matchMedia('(display-mode: standalone)');
	const getButton = () => document.getElementById('install-app');
	const updateButton = () => {
		const button = getButton();
		if (button) button.hidden = !pendingPrompt || standalone.matches || window.navigator.standalone === true;
	};
	window.addEventListener('beforeinstallprompt', (event) => {
		event.preventDefault();
		pendingPrompt = event;
		updateButton();
	});
	window.addEventListener('appinstalled', () => {
		pendingPrompt = null;
		updateButton();
	});
	standalone.addEventListener('change', updateButton);
	document.addEventListener('DOMContentLoaded', () => {
		updateButton();
		getButton()?.addEventListener('click', async () => {
			if (!pendingPrompt) return;
			const prompt = pendingPrompt;
			pendingPrompt = null;
			updateButton();
			try {
				await prompt.prompt();
				await prompt.userChoice;
			} catch {
				// Wait for a fresh browser event rather than reusing a spent prompt.
			}
		});
	});
})();
