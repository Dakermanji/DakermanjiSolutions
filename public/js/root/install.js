//! public/js/root/install.js
// Offer installation only when the browser supplies an install prompt.
(() => {
	let pendingPrompt = null;
	const standalone = window.matchMedia('(display-mode: standalone)');
	const getButton = () => document.getElementById('install-app');
	const updateButton = () => {
		const button = getButton();
		if (!button) return;
		const shouldHide = !pendingPrompt || standalone.matches || window.navigator.standalone === true;
		const wasHidden = button.hidden;
		if (shouldHide && !button.hidden) window.AppTooltips?.reset(button);
		button.hidden = shouldHide;
		if (!shouldHide && wasHidden) window.AppTooltips?.initIn(button.parentElement);
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
