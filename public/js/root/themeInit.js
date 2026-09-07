//! public/js/root/themeInit.js

(() => {
	const root = document.documentElement;
	const values = ['light', 'dark', 'system'];
	const storedPreference = localStorage.getItem('theme-preference');
	const serverPreference = root.dataset.themePreference;
	const isAuthenticated = root.dataset.authenticated === 'true';
	const preference = isAuthenticated || !values.includes(storedPreference)
		? serverPreference || 'system'
		: storedPreference;
	const resolvedTheme = preference === 'system'
		? (window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light')
		: preference;

	root.setAttribute('data-theme', resolvedTheme);
	root.setAttribute('data-theme-preference', preference);
})();
