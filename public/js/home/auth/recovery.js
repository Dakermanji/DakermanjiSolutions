//! public/js/home/auth/recovery.js

const recoveryForm = document.querySelector('#recoveryModal form');

const recoveryContactLink = document.querySelector('[data-recovery-contact]');

recoveryContactLink?.addEventListener('click', (event) => {
	const recoveryModal = document.getElementById('recoveryModal');
	const contactSection = document.getElementById('contact');
	if (!recoveryModal || !contactSection || !window.bootstrap?.Modal) return;

	event.preventDefault();
	recoveryModal.addEventListener(
		'hidden.bs.modal',
		() => {
			window.location.hash = 'contact';
			contactSection.scrollIntoView();
		},
		{ once: true },
	);
	bootstrap.Modal.getOrCreateInstance(recoveryModal).hide();
});

if (recoveryForm) {
	recoveryForm.addEventListener('keydown', (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
		}
	});
}
