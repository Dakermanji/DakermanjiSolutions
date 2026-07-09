//! public/js/root/tooltips.js

/**
 * Tooltips Controller
 * -------------------
 * Initializes and manages Bootstrap tooltips across the site.
 *
 * Behavior:
 * - Regular tooltips work on all screen sizes
 * - Tooltips inside specific responsive containers
 *   only work above a defined breakpoint
 *
 * Notes:
 * - Designed for Bootstrap 5
 * - Loaded globally on the client side
 * - Assumes Bootstrap JS bundle is already available
 */

/**
 * Minimum width required for responsive-container tooltips.
 * Matches Bootstrap's lg breakpoint behavior.
 */
const TOOLTIP_MIN_WIDTH = 992;

/**
 * Containers whose tooltips should only be enabled
 * when the viewport is wide enough.
 *
 * Add more selectors here later if needed.
 *
 * Example:
 * ['#main-navbar', '#some-future-toolbar']
 */
const RESPONSIVE_TOOLTIP_CONTAINERS = ['#main-navbar'];

/**
 * Returns true when responsive-container tooltips
 * should be enabled.
 *
 * @returns {boolean}
 */
function responsiveTooltipsEnabled() {
	return window.innerWidth >= TOOLTIP_MIN_WIDTH;
}

/**
 * Returns true if the given element is inside
 * one of the responsive tooltip containers.
 *
 * @param {Element} el
 * @returns {boolean}
 */
function isInsideResponsiveTooltipContainer(el) {
	return RESPONSIVE_TOOLTIP_CONTAINERS.some((selector) =>
		el.closest(selector),
	);
}

/**
 * Hides all active Bootstrap tooltips on the page.
 * Useful before collapsing menus or changing UI state.
 */
function hideAllTooltips() {
	document.querySelectorAll('.has-tooltip').forEach((el) => {
		const instance = bootstrap.Tooltip.getInstance(el);
		instance?.hide();
	});
}

/**
 * Fully removes a tooltip instance from one element.
 * Useful before hiding/replacing the trigger element.
 *
 * @param {Element|null|undefined} el
 */
function resetTooltip(el) {
	if (!el) return;

	const instance = bootstrap.Tooltip.getInstance(el);
	instance?.dispose();
}

/**
 * Initializes Bootstrap tooltips within a given DOM scope.
 *
 * Rules:
 * - Tooltips inside responsive containers are skipped
 *   when the viewport is below the minimum width
 * - All other tooltips are initialized normally
 *
 * Can be reused for dynamically injected content.
 *
 * @param {Document|Element} scope - Root element to scan for tooltips
 */
function initTooltipsIn(scope = document) {
	const nodes = scope.querySelectorAll('.has-tooltip');

	nodes.forEach((el) => {
		const insideResponsiveContainer =
			isInsideResponsiveTooltipContainer(el);

		if (insideResponsiveContainer && !responsiveTooltipsEnabled()) {
			return;
		}

		bootstrap.Tooltip.getOrCreateInstance(el, {
			trigger: 'hover',
			delay: { show: 1000, hide: 0 },
		});
	});
}

/**
 * Disposes tooltips only inside the responsive containers.
 *
 * This is used when the viewport becomes too small,
 * so those tooltips do not remain active where text
 * is already visible beside the icons.
 */
function destroyResponsiveContainerTooltips() {
	RESPONSIVE_TOOLTIP_CONTAINERS.forEach((selector) => {
		document.querySelectorAll(`${selector} .has-tooltip`).forEach((el) => {
			const instance = bootstrap.Tooltip.getInstance(el);
			instance?.dispose();
		});
	});
}

/**
 * Updates tooltip state for responsive containers
 * when the viewport size changes.
 *
 * - On large screens: initialize them
 * - On small screens: destroy them
 */
function updateResponsiveTooltipState() {
	if (responsiveTooltipsEnabled()) {
		initTooltipsIn(document);
	} else {
		destroyResponsiveContainerTooltips();
	}
}

// Initialize tooltips on initial page load
initTooltipsIn(document);

// Update responsive-container tooltips on resize
window.addEventListener('resize', updateResponsiveTooltipState);

window.AppTooltips = {
	hideAll: hideAllTooltips,
	initIn: initTooltipsIn,
	reset: resetTooltip,
};
