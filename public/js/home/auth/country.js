//! public/js/home/auth/country.js

const countryDropdown = document.querySelector('.complete-signup-country');

if (countryDropdown) {
	const input = document.querySelector('#countryCode');
	const selected = countryDropdown.querySelector(
		'.complete-signup-country__selected',
	);
	const menu = countryDropdown.querySelector('.complete-signup-country__menu');
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
		if (
			!menu?.classList.contains('show') ||
			e.isComposing ||
			e.ctrlKey ||
			e.metaKey ||
			e.altKey ||
			e.key.length !== 1
		) {
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

	countryDropdown.addEventListener('hidden.bs.dropdown', () => {
		window.clearTimeout(countrySearchTimer);
		countrySearch = '';
	});
}
