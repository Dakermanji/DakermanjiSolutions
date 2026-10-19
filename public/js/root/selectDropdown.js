//! public/js/root/selectDropdown.js

(() => {
	if (!window.bootstrap?.Dropdown) return;

	function showOption(container, option) {
		const label = document.createElement('span');
		label.className = 'app-select__label';
		label.textContent = option.textContent.trim();
		const iconClass = option.dataset.iconClass;
		const iconText = option.dataset.iconText;
		if (!iconClass && !iconText) {
			container.replaceChildren(label);
			return;
		}
		const icon = document.createElement(iconClass ? 'i' : 'span');
		icon.className = iconClass
			? `bi ${iconClass} app-select__icon`
			: 'app-select__icon-text';
		if (iconText) icon.textContent = iconText;
		icon.setAttribute('aria-hidden', 'true');
		container.replaceChildren(icon, label);
	}

	document.querySelectorAll('select[data-app-select]').forEach((select) => {
		const id = select.id;
		if (!id) return;
		const wasRequired = select.required;
		const wasAutoWidth = select.classList.contains('w-auto');
		const wrapper = document.createElement('div');
		wrapper.className = `dropdown app-select${wasAutoWidth ? ' w-auto' : ''}`;
		if (select.dir) wrapper.dir = select.dir;

		const toggle = document.createElement('button');
		toggle.type = 'button';
		toggle.id = id;
		toggle.className = 'form-select app-select__toggle';
		toggle.dataset.bsToggle = 'dropdown';
		toggle.setAttribute('aria-expanded', 'false');
		toggle.disabled = select.disabled;

		const menu = document.createElement('ul');
		menu.className = 'dropdown-menu app-dropdown-surface app-select__menu';
		menu.setAttribute('aria-labelledby', id);
		const items = [];
		for (const option of select.options) {
			const listItem = document.createElement('li');
			const item = document.createElement('button');
			item.type = 'button';
			item.className = 'dropdown-item app-dropdown-option';
			showOption(item, option);
			item.disabled = option.disabled;
			item.addEventListener('click', () => {
				select.value = option.value;
				select.dispatchEvent(new Event('change', { bubbles: true }));
				toggle.classList.remove('is-invalid');
				toggle.removeAttribute('aria-invalid');
			});
			listItem.appendChild(item);
			menu.appendChild(listItem);
			items.push({ option, item });
		}

		function syncSelection() {
			const selectedOption = select.selectedOptions[0];
			if (selectedOption) showOption(toggle, selectedOption);
			else toggle.replaceChildren();
			for (const { option, item } of items) {
				const selected = option.selected;
				item.classList.toggle('active', selected);
				if (selected) item.setAttribute('aria-current', 'true');
				else item.removeAttribute('aria-current');
			}
		}

		select.parentNode.insertBefore(wrapper, select);
		wrapper.append(toggle, menu, select);
		select.id = `${id}-native`;
		select.classList.remove('w-auto');
		select.classList.add('visually-hidden');
		select.tabIndex = -1;
		select.setAttribute('aria-hidden', 'true');
		select.required = false;
		select.addEventListener('change', syncSelection);
		syncSelection();

		if (wasRequired) {
			select.form?.addEventListener('submit', (event) => {
				if (select.value) return;
				event.preventDefault();
				toggle.classList.add('is-invalid');
				toggle.setAttribute('aria-invalid', 'true');
				toggle.focus();
			});
		}
	});
})();
