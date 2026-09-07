//! public/js/root/csrf.js

(() => {
	const token = document.querySelector('meta[name="csrf-token"]')?.content;
	const fieldName = '_csrf';
	const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
	const nativeFetch = window.fetch.bind(window);

	function isSameOrigin(input) {
		const url = typeof input === 'string' || input instanceof URL
			? input
			: input?.url;

		return new URL(url || window.location.href, window.location.href).origin
			=== window.location.origin;
	}

	function addToForm(form) {
		if (!token || !(form instanceof HTMLFormElement)) return;

		const method = String(form.method || 'GET').toUpperCase();
		if (safeMethods.has(method) || !isSameOrigin(form.action)) return;

		let input = form.elements.namedItem(fieldName);
		if (!(input instanceof HTMLInputElement)) {
			input = document.createElement('input');
			input.type = 'hidden';
			input.name = fieldName;
			form.prepend(input);
		}

		input.value = token;
	}

	window.AppCsrf = { addToForm, token };

	document.addEventListener('submit', (event) => addToForm(event.target), true);

	window.fetch = (input, init = {}) => {
		const method = String(init.method || input?.method || 'GET').toUpperCase();

		if (!token || safeMethods.has(method) || !isSameOrigin(input)) {
			return nativeFetch(input, init);
		}

		const headers = new Headers(init.headers || input?.headers);
		headers.set('X-CSRF-Token', token);

		return nativeFetch(input, { ...init, headers });
	};
})();
