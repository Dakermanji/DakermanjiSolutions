//! public/js/profile/account.js

const usernameEditor = document.querySelector('[data-profile-username]');

if (usernameEditor) {
	const display = usernameEditor.querySelector('[data-username-display]');
	const form = usernameEditor.querySelector('[data-username-form]');
	const input = form?.querySelector('input[name="username"]');
	const editButton = usernameEditor.querySelector('[data-username-edit]');
	const cancelButton = usernameEditor.querySelector('[data-username-cancel]');
	const originalUsername = input?.value || '';

	function setEditing(isEditing) {
		window.AppTooltips?.reset(editButton);
		window.AppTooltips?.reset(cancelButton);

		display?.classList.toggle('d-none', isEditing);
		form?.classList.toggle('d-none', !isEditing);

		if (isEditing) {
			input?.focus();
			input?.select();
		} else {
			window.AppTooltips?.initIn(usernameEditor);
		}
	}

	editButton?.addEventListener('click', () => setEditing(true));

	cancelButton?.addEventListener('click', () => {
		if (input) {
			input.value = originalUsername;
		}

		setEditing(false);
	});
}

const countryEditor = document.querySelector('[data-profile-country]');

if (countryEditor) {
	const display = countryEditor.querySelector('[data-country-display]');
	const target = countryEditor.querySelector('[data-country-editor]');
	const editButton = countryEditor.querySelector('[data-country-edit]');

	function initCountryDropdown(scope) {
		const dropdown = scope.querySelector('.complete-signup-country');
		const input = scope.querySelector('#profileCountryCode');
		const selected = dropdown?.querySelector(
			'.complete-signup-country__selected',
		);
		const options = dropdown?.querySelectorAll(
			'.complete-signup-country__option',
		);
		let countrySearch = '';
		let countrySearchTimer = null;

		function focusCountryOption(search) {
			const normalizedSearch = search.toLocaleLowerCase();
			const match = [...(options || [])].find((option) => {
				const countryName = option.dataset.countryName || '';

				return (
					option.dataset.countryCode &&
					countryName.toLocaleLowerCase().startsWith(normalizedSearch)
				);
			});

			if (!match) return false;

			match.focus();
			match.scrollIntoView({ block: 'nearest' });

			return true;
		}

		options?.forEach((option) => {
			option.addEventListener('click', () => {
				if (!input || !selected) return;

				const countryCode = option.dataset.countryCode || '';
				const countryName = option.dataset.countryName || '';
				const flag = option.querySelector('.fi')?.cloneNode(true);

				input.value = countryCode;
				selected.textContent = '';

				if (flag) {
					flag.classList.add('complete-signup-country__flag');
					selected.append(flag, document.createTextNode(countryName));
					return;
				}

				selected.textContent = countryName;
			});
		});

		dropdown?.addEventListener('keydown', (e) => {
			if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) {
				return;
			}

			e.preventDefault();

			window.clearTimeout(countrySearchTimer);
			countrySearch += e.key;

			if (!focusCountryOption(countrySearch)) {
				countrySearch = e.key;
				focusCountryOption(countrySearch);
			}

			countrySearchTimer = window.setTimeout(() => {
				countrySearch = '';
			}, 800);
		});
	}

	function initDynamicTooltips(scope) {
		if (!window.bootstrap?.Tooltip) return;

		window.AppTooltips?.initIn(scope);
	}

	async function loadEditor() {
		if (!target || target.dataset.loaded === 'true') {
			return;
		}

		const url = editButton?.dataset.countryEditorUrl;

		if (!url) return;

		editButton.disabled = true;

		try {
			const response = await fetch(url, {
				headers: { Accept: 'text/html' },
			});

			if (!response.ok) return;

			target.innerHTML = await response.text();
			target.dataset.loaded = 'true';
			initCountryDropdown(target);
			initDynamicTooltips(target);

			const cancelButton = target.querySelector('[data-country-cancel]');
			cancelButton?.addEventListener('click', () => {
				window.AppTooltips?.reset(cancelButton);
				display?.classList.remove('d-none');
				target.classList.add('d-none');
				window.AppTooltips?.initIn(countryEditor);
			});
		} finally {
			editButton.disabled = false;
		}
	}

	editButton?.addEventListener('click', async () => {
		window.AppTooltips?.reset(editButton);
		await loadEditor();
		display?.classList.add('d-none');
		target?.classList.remove('d-none');
	});
}

const passwordModalTriggers = document.querySelectorAll(
	'[data-password-modal-trigger]',
);

async function loadPasswordModal() {
	const existingModal = document.querySelector('#profilePasswordModal');

	if (existingModal) {
		return existingModal;
	}

	const trigger = [...passwordModalTriggers].find(
		(item) => item.dataset.passwordModalUrl,
	);
	const url = trigger?.dataset.passwordModalUrl;

	if (!url) {
		return null;
	}

	passwordModalTriggers.forEach((item) => {
		item.disabled = true;
	});

	try {
		const response = await fetch(url, {
			headers: { Accept: 'text/html' },
		});

		if (!response.ok) {
			return null;
		}

		const wrapper = document.createElement('div');
		wrapper.innerHTML = await response.text();

		const modal = wrapper.querySelector('#profilePasswordModal');

		if (!modal) {
			return null;
		}

		document.body.append(modal);

		return modal;
	} finally {
		passwordModalTriggers.forEach((item) => {
			item.disabled = false;
		});
	}
}

passwordModalTriggers.forEach((passwordModalTrigger) => {
	passwordModalTrigger.addEventListener('click', async () => {
		const modal = await loadPasswordModal();

		if (!modal || !window.bootstrap?.Modal) {
			return;
		}

		bootstrap.Modal.getOrCreateInstance(modal).show();
	});
});
