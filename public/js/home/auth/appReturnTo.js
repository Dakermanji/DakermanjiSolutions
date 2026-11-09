//! public/js/home/auth/appReturnTo.js

document.getElementById('authModal')?.addEventListener('show.bs.modal', (event) => {
	const modal = event.currentTarget;
	const form = modal.querySelector('form[action="/auth/signin"]');
	const destination = event.relatedTarget
		? event.relatedTarget.dataset.appReturnTo || '/'
		: form?.querySelector('input[name="returnTo"]')?.value || '/';
	if (form) {
		let field = form.querySelector('input[name="returnTo"]');
		if (!field) {
			field = document.createElement('input');
			field.type = 'hidden';
			field.name = 'returnTo';
			form.append(field);
		}
		field.value = destination;
	}
	for (const provider of ['google', 'github', 'discord']) {
		modal.querySelectorAll(`a[href^="/auth/${provider}"]`).forEach((link) => {
			link.href = `/auth/${provider}?returnTo=${encodeURIComponent(destination)}`;
		});
	}
	if (event.relatedTarget?.dataset.appReturnTo) {
		const tab = document.getElementById('auth-signin-tab');
		if (tab) bootstrap.Tab.getOrCreateInstance(tab).show();
	}
});
