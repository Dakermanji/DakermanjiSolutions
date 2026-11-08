//! public/js/root/theme.js

/**
 * Theme Controller
 *
 * Handles theme preference persistence and applies the resolved theme
 * to the document root using the `data-theme` attribute.
 *
 * Supported preferences:
 * - light
 * - dark
 * - system
 *
 * Resolved themes:
 * - light
 * - dark
 */

const THEME_STORAGE_KEY = 'theme-preference';
const THEME_ATTRIBUTE = 'data-theme';
const THEME_PREFERENCE_ATTRIBUTE = 'data-theme-preference';
const THEME_VALUES = ['light', 'dark', 'system'];

/**
 * Returns true when the OS/browser prefers dark mode.
 *
 * @returns {boolean}
 */
function prefersDarkMode() {
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Returns the saved theme preference or "system" by default.
 *
 * @returns {'light' | 'dark' | 'system'}
 */
function getStoredThemePreference() {
	const root = document.documentElement;
	const serverPreference = root.dataset.themePreference;
	const isAuthenticated = root.dataset.authenticated === 'true';

	if (isAuthenticated && THEME_VALUES.includes(serverPreference)) {
		return serverPreference;
	}

	const storedPreference = localStorage.getItem(THEME_STORAGE_KEY);

	return THEME_VALUES.includes(storedPreference)
		? storedPreference
		: 'system';
}

/**
 * Saves the user's theme preference.
 *
 * @param {'light' | 'dark' | 'system'} preference
 */
function setStoredThemePreference(preference) {
	localStorage.setItem(THEME_STORAGE_KEY, preference);
}

/**
 * Persists theme preference for signed-in users.
 *
 * @param {'light' | 'dark' | 'system'} preference
 * @returns {Promise<void>}
 */
async function syncThemePreference(preference) {
	const root = document.documentElement;

	if (root.dataset.authenticated !== 'true') {
		return;
	}

	const response = await fetch('/theme', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Accept: 'application/json',
		},
		body: JSON.stringify({
			theme: preference,
		}),
	});

	if (!response.ok) {
		throw new Error('Theme preference sync failed');
	}
}

/**
 * Resolves a user preference into an actual theme value.
 *
 * @param {'light' | 'dark' | 'system'} preference
 * @returns {'light' | 'dark'}
 */
function resolveTheme(preference) {
	if (preference === 'system') {
		return prefersDarkMode() ? 'dark' : 'light';
	}

	return preference;
}

/**
 * Applies the resolved theme and stores the original preference
 * as attributes on the document root.
 *
 * @param {'light' | 'dark' | 'system'} preference
 */
function applyTheme(preference) {
	const resolvedTheme = resolveTheme(preference);
	const root = document.documentElement;

	root.setAttribute(THEME_ATTRIBUTE, resolvedTheme);
	root.setAttribute(THEME_PREFERENCE_ATTRIBUTE, preference);
	root.dataset.themePreference = preference;

	updateThemeUI(preference);
}

/**
 * Updates theme dropdown active state and trigger icon/text if present.
 *
 * Expected markup:
 * - [data-theme-value]
 * - optional [data-theme-trigger-icon]
 * - optional [data-theme-trigger-text]
 *
 * @param {'light' | 'dark' | 'system'} preference
 */
function updateThemeUI(preference) {
	const themeButtons = document.querySelectorAll('[data-theme-value]');
	const triggerIcons = document.querySelectorAll('[data-theme-trigger-icon]');
	const triggerTexts = document.querySelectorAll('[data-theme-trigger-text]');

	const iconMap = {
		light: 'bi-sun',
		dark: 'bi-moon-stars',
		system: 'bi-circle-half',
	};

	let activeLabel = '';

	themeButtons.forEach((button) => {
		const isActive = button.dataset.themeValue === preference;

		button.classList.toggle('active', isActive);
		button.setAttribute('aria-pressed', String(isActive));

		if (isActive) {
			activeLabel =
				button.querySelector('.theme-label')?.textContent.trim() ||
				button.textContent.trim();
		}
	});

	triggerIcons.forEach((triggerIcon) => {
		triggerIcon.className = `bi ${iconMap[preference]}`;
	});

	if (activeLabel) {
		triggerTexts.forEach((triggerText) => {
			triggerText.textContent = activeLabel;
		});
	}
}

/**
 * Handles theme selection from dropdown buttons.
 *
 * @param {MouseEvent} event
 */
function handleThemeSelection(event) {
	const button = event.target.closest('[data-theme-value]');

	if (!button) return;

	const { themeValue } = button.dataset;

	if (!THEME_VALUES.includes(themeValue)) return;

	setStoredThemePreference(themeValue);
	applyTheme(themeValue);
	syncThemePreference(themeValue).catch(() => {
		// Local state remains applied; the next signed-in page load restores DB state.
	});
}

/**
 * Re-applies the theme when system color scheme changes,
 * but only if the saved preference is "system".
 */
function handleSystemThemeChange() {
	const currentPreference = getStoredThemePreference();

	if (currentPreference === 'system') {
		applyTheme('system');
	}
}

/**
 * Initializes the theme controller.
 */
function initTheme() {
	const savedPreference = getStoredThemePreference();
	const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');

	applyTheme(savedPreference);

	document.addEventListener('click', handleThemeSelection);
	colorSchemeMedia.addEventListener('change', handleSystemThemeChange);
}

document.addEventListener('DOMContentLoaded', initTheme);
