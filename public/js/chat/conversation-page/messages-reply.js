//! public/js/chat/conversation-page/messages-reply.js

(() => {
	function createReplyController({
		chatPage,
		composer,
		focusComposerInput,
	}) {
		function setReplyTarget(row) {
			if (!row || !composer?.elements.replyToMessageId) return;

			const messageId = row.dataset.chatMessageId || '';
			const senderName = row.dataset.chatMessageSenderName || '';
			const preview =
				row.querySelector('.chat-message-text')?.textContent?.replace(/\s+/g, ' ').trim() || '';

			if (!messageId) return;

			composer.elements.replyToMessageId.value = messageId;
			updateReplyPreview({
				preview,
				senderName,
			});
			focusComposerInput();
		}

		function updateReplyPreview({ preview = '', senderName = '' } = {}) {
			const previewShell = composer?.querySelector('[data-chat-reply-preview]');
			if (!previewShell) return;

			const userLabel = previewShell.querySelector('[data-chat-reply-preview-user]');
			const previewText = previewShell.querySelector('[data-chat-reply-preview-text]');
			const labelTemplate = chatPage.dataset.replyingToLabel || '';
			const label = labelTemplate.replace('{{user}}', senderName);

			if (userLabel) {
				userLabel.textContent = label;
			}
			if (previewText) {
				previewText.textContent = preview;
			}

			previewShell.hidden = false;
			window.AppTooltips?.initIn(previewShell);
		}

		function clearReplyTarget() {
			if (composer?.elements.replyToMessageId) {
				composer.elements.replyToMessageId.value = '';
			}

			const previewShell = composer?.querySelector('[data-chat-reply-preview]');
			if (previewShell) {
				previewShell.hidden = true;
			}
		}

		return {
			clearReplyTarget,
			setReplyTarget,
		};
	}

	window.ChatConversationMessageReply = {
		createReplyController,
	};
})();
