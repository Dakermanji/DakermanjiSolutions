//! public/js/chat/conversation-page/renderer-actions.js

(() => {
	function createMessageActions(message, {
		deleteLabel = '',
		deleteUrl = '',
		editLabel = '',
		editUrl = '',
		replyLabel = '',
		showReply = true,
	} = {}) {
		const actions = document.createElement('div');
		actions.className = 'chat-message-actions';

		if (showReply) {
			actions.appendChild(createReplyButton(replyLabel));
		}

		if (message.canEdit && editUrl) {
			actions.appendChild(createEditButton(editLabel));
		}

		if (message.canDelete && deleteUrl) {
			actions.appendChild(createDeleteForm(message, deleteUrl, deleteLabel));
		}

		window.AppTooltips?.initIn(actions);
		return actions;
	}

	function createReplyButton(replyLabel = '', extraClassName = '') {
		const button = document.createElement('button');
		button.className = `btn btn-action-outline chat-message-action has-tooltip${extraClassName ? ` ${extraClassName}` : ''}`;
		button.type = 'button';
		button.dataset.chatMessageReply = 'true';
		button.dataset.bsTitle = replyLabel;
		button.setAttribute('aria-label', replyLabel);

		const icon = document.createElement('i');
		icon.className = 'bi bi-reply';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		return button;
	}

	function createEditButton(editLabel = '') {
		const button = document.createElement('button');
		button.className = 'btn btn-action-outline chat-message-action has-tooltip';
		button.type = 'button';
		button.dataset.chatMessageEdit = 'true';
		button.dataset.bsTitle = editLabel;
		button.setAttribute('aria-label', editLabel);

		const icon = document.createElement('i');
		icon.className = 'bi bi-pencil';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		return button;
	}

	function createDeleteForm(message, deleteUrl, deleteLabel = '') {
		const form = document.createElement('form');
		form.className = 'chat-message-delete-form';
		form.method = 'POST';
		form.action = deleteUrl;
		form.dataset.chatMessageDeleteForm = 'true';

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'messageId';
		input.value = message.id || '';

		const button = document.createElement('button');
		button.className = 'btn btn-action-outline chat-message-action is-danger has-tooltip';
		button.type = 'submit';
		button.dataset.bsTitle = deleteLabel;
		button.setAttribute('aria-label', deleteLabel);

		const icon = document.createElement('i');
		icon.className = 'bi bi-trash3';
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		form.append(input, button);
		return form;
	}

	function createFlagForm(message, flagUrl, {
		flagLabel = '',
		flaggedLabel = '',
	} = {}) {
		const isFlagged = Boolean(message.flaggedByViewer);
		const label = isFlagged ? flaggedLabel : flagLabel;
		const form = document.createElement('form');
		form.className = 'chat-message-flag-form';
		form.method = 'POST';
		form.action = flagUrl;

		const input = document.createElement('input');
		input.type = 'hidden';
		input.name = 'messageId';
		input.value = message.id || '';

		const button = document.createElement('button');
		button.className = `btn btn-action-outline chat-message-flag-button has-tooltip${isFlagged ? ' is-flagged' : ''}`;
		button.type = 'submit';
		button.dataset.bsTitle = label;
		button.setAttribute('aria-label', label);
		button.disabled = isFlagged;

		const icon = document.createElement('i');
		icon.className = `bi ${isFlagged ? 'bi-flag-fill' : 'bi-flag'}`;
		icon.setAttribute('aria-hidden', 'true');

		button.appendChild(icon);
		form.append(input, button);
		window.AppTooltips?.initIn(form);
		return form;
	}

	window.ChatConversationRendererActions = {
		createFlagForm,
		createMessageActions,
		createReplyButton,
	};
})();
