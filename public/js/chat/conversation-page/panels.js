//! public/js/chat/conversation-page/panels.js

(() => {
	function createSidePanelController({
		composer,
		composerNotice,
		messageSurface,
		typingIndicator,
		focusComposerInput,
		clearTypingTimers,
		panels = {},
		toggles = {},
	}) {
		function setActiveSidePanel(panelName) {
			const visibility = {
				activity: panelName === 'activity',
				flags: panelName === 'flags',
				members: panelName === 'members',
			};
			const isAnyPanelVisible = Object.values(visibility).some(Boolean);

			for (const [name, panel] of Object.entries(panels)) {
				if (panel) {
					panel.hidden = !visibility[name];
				}
			}

			messageSurface.hidden = isAnyPanelVisible;
			if (typingIndicator) {
				typingIndicator.hidden = true;
			}
			if (composerNotice) {
				composerNotice.hidden = isAnyPanelVisible;
			}
			if (composer) {
				composer.hidden = isAnyPanelVisible;
			}

			for (const [name, toggle] of Object.entries(toggles)) {
				toggle?.classList.toggle('is-active', visibility[name]);
				toggle?.setAttribute(
					'aria-expanded',
					visibility[name] ? 'true' : 'false',
				);
			}

			if (isAnyPanelVisible) {
				clearTypingTimers?.();
				return;
			}

			focusComposerInput?.();
		}

		return { setActiveSidePanel };
	}

	window.ChatConversationPanels = {
		createSidePanelController,
	};
})();
