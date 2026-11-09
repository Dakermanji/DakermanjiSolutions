//! public/js/home/auth.js

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

const countryDropdown = document.querySelector('.complete-signup-country');

if (countryDropdown) {
	const input = document.querySelector('#countryCode');
	const selected = countryDropdown.querySelector(
		'.complete-signup-country__selected',
	);
	const options = countryDropdown.querySelectorAll(
		'.complete-signup-country__option',
	);
	let countrySearch = '';
	let countrySearchTimer = null;

	function focusCountryOption(search) {
		const normalizedSearch = search.toLocaleLowerCase();
		const match = [...options].find((option) => {
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

	options.forEach((option) => {
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

	countryDropdown.addEventListener('keydown', (e) => {
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

const avatarPicker = document.querySelector('.complete-signup-avatar');

if (avatarPicker) {
	const input = document.querySelector('#avatarSeed');
	const preview = document.querySelector('#completeSignupAvatarPreview');
	const previewFrame = avatarPicker.querySelector(
		'.complete-signup-avatar__preview',
	);
	const backgroundInput = avatarPicker.querySelector(
		'[data-avatar-background]',
	);
	const refreshButton = avatarPicker.querySelector('[data-avatar-refresh]');
	const styleName = avatarPicker.querySelector('[data-avatar-style-name]');
	const styles = [...avatarPicker.querySelectorAll('[data-avatar-style]')];
	const grids = [...avatarPicker.querySelectorAll('[data-avatar-grid]')];
	let options = [...avatarPicker.querySelectorAll('[data-avatar-value]')];

	function normalizeBackground(value) {
		return /^#[a-f0-9]{6}$/i.test(value) ? value.toLowerCase() : '#f7c59f';
	}

	function withBackground(avatarValue, background) {
		const [style, seed] = avatarValue.split(':');
		const normalized = normalizeBackground(background).replace('#', '');

		return `${style}:${seed}:${normalized}`;
	}

	function setAvatarBackground(background) {
		const normalized = normalizeBackground(background);

		previewFrame?.style.setProperty('--avatar-bg', normalized);
		avatarPicker.style.setProperty('--avatar-bg', normalized);

		if (input?.value) {
			input.value = withBackground(input.value, normalized);
		}
	}

	function selectAvatar(option) {
		if (!input || !preview || !option) return;

		options.forEach((item) => {
			const isSelected = item === option;
			item.classList.toggle('is-active', isSelected);
			item.setAttribute('aria-pressed', String(isSelected));
		});

		input.value = withBackground(
			option.dataset.avatarValue || '',
			backgroundInput?.value || '#f7c59f',
		);
		preview.src = option.dataset.avatarSrc || '';
	}

	function createAvatarOption(avatar, index) {
		const button = document.createElement('button');
		const frame = document.createElement('span');
		const image = document.createElement('img');

		button.type = 'button';
		button.className = 'complete-signup-avatar__option';
		button.dataset.avatarValue = avatar.value || '';
		button.dataset.avatarSrc = avatar.src || '';
		button.setAttribute('aria-label', `${avatarPicker.dataset.avatarLabel} ${index + 1}`);
		button.setAttribute('aria-pressed', 'false');
		button.addEventListener('click', () => selectAvatar(button));

		image.src = avatar.src || '';
		image.alt = '';

		frame.append(image);
		button.append(frame);

		return button;
	}

	function refreshOptionList() {
		options = [...avatarPicker.querySelectorAll('[data-avatar-value]')];
	}

	function selectStyle(styleButton) {
		const styleKey = styleButton.dataset.avatarStyle || '';

		styles.forEach((item) => {
			const isSelected = item === styleButton;
			item.classList.toggle('is-active', isSelected);
			item.setAttribute('aria-pressed', String(isSelected));
		});
		avatarPicker.dataset.activeStyle = styleKey;

		if (styleName) {
			styleName.textContent = styleButton.dataset.avatarStyleLabel || '';
		}

		grids.forEach((grid) => {
			grid.classList.toggle('d-none', grid.dataset.avatarGrid !== styleKey);
		});

		const firstOption = avatarPicker.querySelector(
			`[data-avatar-grid="${styleKey}"] [data-avatar-value]`,
		);

		selectAvatar(firstOption);
	}

	async function refreshActiveStyle() {
		const activeStyle = avatarPicker.dataset.activeStyle || '';
		const activeGrid = grids.find(
			(grid) => grid.dataset.avatarGrid === activeStyle,
		);
		const activeStyleButton = styles.find(
			(styleButton) => styleButton.dataset.avatarStyle === activeStyle,
		);

		if (!activeStyle || !activeGrid || !refreshButton) return;

		refreshButton.disabled = true;
		refreshButton.classList.add('is-loading');

		try {
			const response = await fetch(
				`/avatar/options/${encodeURIComponent(activeStyle)}`,
				{
					headers: { Accept: 'application/json' },
				},
			);

			if (!response.ok) return;

			const data = await response.json();
			const style = data?.style;
			const freshOptions = Array.isArray(style?.options)
				? style.options
				: [];

			activeGrid.replaceChildren(...freshOptions.map(createAvatarOption));
			refreshOptionList();

			const previewImage = activeStyleButton?.querySelector('img');
			if (previewImage && style?.preview) {
				previewImage.src = style.preview;
			}

			selectAvatar(activeGrid.querySelector('[data-avatar-value]'));
		} finally {
			refreshButton.disabled = false;
			refreshButton.classList.remove('is-loading');
		}
	}

	styles.forEach((styleButton) => {
		styleButton.addEventListener('click', () => selectStyle(styleButton));
	});

	options.forEach((option) => {
		option.addEventListener('click', () => selectAvatar(option));
	});

	backgroundInput?.addEventListener('input', () => {
		setAvatarBackground(backgroundInput.value);
	});

	refreshButton?.addEventListener('click', refreshActiveStyle);

	setAvatarBackground(backgroundInput?.value || '#f7c59f');
}
