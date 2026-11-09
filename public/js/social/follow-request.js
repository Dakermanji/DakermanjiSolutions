//! public/js/social/follow-request.js

if (followRequestForm) {
	const identifier = followRequestForm.elements.namedItem('identifier');
	const error = document.getElementById('follow-request-error');
	const usernamePattern = /^(?=(?:.*[a-zA-Z]){2})[a-zA-Z0-9_.-]{3,20}$/;
	const emailLocalAtomPattern = /^[\p{L}\p{N}!#$%&'*+/=?^_`{|}~-]+$/u;
	const emailDomainLabelPattern = /^[\p{L}\p{N}](?:[\p{L}\p{N}-]{0,61}[\p{L}\p{N}])?$/u;

	function isValidFollowEmail(value) {
		const separator = value.lastIndexOf('@');
		if (separator < 1) return false;

		const local = value.slice(0, separator);
		const domain = value.slice(separator + 1);
		const labels = domain.split('.');
		const isQuotedLocal = local.startsWith('"') && local.endsWith('"') && local.length > 2;
		return local.length <= 64 &&
			(isQuotedLocal ||
				local.split('.').every((atom) => emailLocalAtomPattern.test(atom))) &&
			labels.length >= 2 && labels.at(-1).length >= 2 &&
			/[\p{L}]/u.test(labels.at(-1)) &&
			labels.every((label) => emailDomainLabelPattern.test(label));
	}

	function clearIdentifierError() {
		identifier.classList.remove('is-invalid');
		identifier.removeAttribute('aria-invalid');
		error.hidden = true;
	}

	identifier.addEventListener('input', clearIdentifierError);
	followRequestForm.addEventListener('submit', (event) => {
		const value = identifier.value.trim();
		if (value.length > 0 && value.length <= 254 &&
			(value.includes('@') ? isValidFollowEmail(value) : usernamePattern.test(value))) {
			clearIdentifierError();
			return;
		}

		event.preventDefault();
		identifier.classList.add('is-invalid');
		identifier.setAttribute('aria-invalid', 'true');
		error.hidden = false;
		identifier.focus();
	});
}
