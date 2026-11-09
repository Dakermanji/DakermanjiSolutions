//! public/js/social/feedback.js

function renderMessage(sectionBody, message) {
	sectionBody.replaceChildren();

	const paragraph = document.createElement('p');
	paragraph.className = 'text-body-secondary mb-0';
	paragraph.textContent = message;

	sectionBody.appendChild(paragraph);
}

function renderLoadingState(sectionBody) {
	sectionBody.replaceChildren();

	const wrapper = document.createElement('div');
	wrapper.className = 'd-flex align-items-center justify-content-center py-3';

	const spinner = document.createElement('div');
	spinner.className = 'spinner-border spinner-border-sm text-primary';
	spinner.setAttribute('role', 'status');

	const label = document.createElement('span');
	label.className = 'visually-hidden';
	label.textContent = sectionBody.dataset.loadingLabel;

	spinner.appendChild(label);
	wrapper.appendChild(spinner);
	sectionBody.appendChild(wrapper);
}

function formatTemplate(template, values) {
	if (!template) return '';

	return Object.entries(values).reduce(
		(result, [key, value]) => result.replaceAll(`{{${key}}}`, value || ''),
		template,
	);
}
