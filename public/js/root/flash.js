//! public/js/root/flash.js

/**
 * Flash message handler
 *
 * Responsibilities:
 * - Automatically dismiss flash messages after a delay
 * - Trigger Bootstrap fade-out animation using `.fade` / `.show`
 * - Safely remove elements from the DOM after transition
 *
 * Notes:
 * - Requires Bootstrap alert markup: `.alert.fade.show`
 * - Uses native class removal instead of Bootstrap JS API
 * - Includes a fallback in case `transitionend` does not fire
 *
 * Behavior:
 * - Waits 5 seconds before starting dismissal of success and info messages
 * - Removes `show` to trigger CSS fade-out
 * - Removes the element after transition ends (or fallback timeout)
 */
setTimeout(() => {
	document.querySelectorAll('.flash-stack [data-auto-dismiss]').forEach((msg) => {
		// Skip if already removed (safety check)
		if (!document.body.contains(msg)) return;

		// Trigger Bootstrap fade-out by removing `.show`
		msg.classList.remove('show');

		// Remove element after CSS transition completes
		msg.addEventListener(
			'transitionend',
			() => {
				msg.remove();
			},
			{ once: true },
		);

		// Fallback: ensure removal if transitionend doesn't fire
		setTimeout(() => {
			if (document.body.contains(msg)) {
				msg.remove();
			}
		}, 1000);
	});
}, 5000);
