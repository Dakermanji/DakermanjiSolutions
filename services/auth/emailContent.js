//! services/auth/emailContent.js

const signupEmailContent = {
	en: {
		subject: 'Verify your email',
		html: (verifyUrl) => `
			<div dir="ltr">
				<p>Welcome!</p>
				<p>Click the link below to complete your signup:</p>
				<p><a href="${verifyUrl}">${verifyUrl}</a></p>
				<p>This link expires in 1 hour.</p>
			</div>
		`,
	},
	fr: {
		subject: 'Vérifiez votre adresse e-mail',
		html: (verifyUrl) => `
			<div dir="ltr">
				<p>Bienvenue&nbsp;!</p>
				<p>Cliquez sur le lien ci-dessous pour terminer votre inscription&nbsp;:</p>
				<p><a href="${verifyUrl}">${verifyUrl}</a></p>
				<p>Ce lien expire dans 1 heure.</p>
			</div>
		`,
	},
	ar: {
		subject: 'تحقق من بريدك الإلكتروني',
		html: (verifyUrl) => `
			<div dir="rtl">
				<p>مرحبًا!</p>
				<p>اضغط على الرابط التالي لإكمال التسجيل:</p>
				<p><a href="${verifyUrl}">${verifyUrl}</a></p>
				<p>تنتهي صلاحية هذا الرابط خلال ساعة واحدة.</p>
			</div>
		`,
	},
};

const resetPasswordEmailContent = {
	en: {
		subject: 'Reset your password',
		html: (url) => `
			<div dir="ltr">
				<p>You requested to reset your password.</p>
				<p>Click the link below to set a new password:</p>
				<p><a href="${url}">${url}</a></p>
				<p>If you did not request this, you can safely ignore this email.</p>
			</div>
		`,
	},

	ar: {
		subject: 'إعادة تعيين كلمة المرور',
		html: (url) => `
			<div dir="rtl">
				<p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بك.</p>
				<p>اضغط على الرابط أدناه لتعيين كلمة مرور جديدة:</p>
				<p><a href="${url}">${url}</a></p>
				<p>إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان.</p>
			</div>
		`,
	},

	fr: {
		subject: 'Réinitialisez votre mot de passe',
		html: (url) => `
			<div dir="ltr">
				<p>Vous avez demandé à réinitialiser votre mot de passe.</p>
				<p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
				<p><a href="${url}">${url}</a></p>
				<p>Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.</p>
			</div>
		`,
	},
};

const accountDeletionEmailContent = {
	en: {
		subject: 'Confirm account deletion',
		html: (url) => `
			<div dir="ltr">
				<p>You requested to delete your account.</p>
				<p>Click the link below to confirm account deletion:</p>
				<p><a href="${url}">${url}</a></p>
				<p>This link expires in 15 minutes. If you did not request this, you can safely ignore this email.</p>
			</div>
		`,
	},

	ar: {
		subject: 'تأكيد حذف الحساب',
		html: (url) => `
			<div dir="rtl">
				<p>لقد طلبت حذف حسابك.</p>
				<p>اضغط على الرابط أدناه لتأكيد حذف الحساب:</p>
				<p><a href="${url}">${url}</a></p>
				<p>تنتهي صلاحية هذا الرابط خلال 15 دقيقة. إذا لم تطلب ذلك، يمكنك تجاهل هذه الرسالة بأمان.</p>
			</div>
		`,
	},

	fr: {
		subject: 'Confirmez la suppression du compte',
		html: (url) => `
			<div dir="ltr">
				<p>Vous avez demandé à supprimer votre compte.</p>
				<p>Cliquez sur le lien ci-dessous pour confirmer la suppression du compte :</p>
				<p><a href="${url}">${url}</a></p>
				<p>Ce lien expire dans 15 minutes. Si vous n’êtes pas à l’origine de cette demande, vous pouvez ignorer cet e-mail.</p>
			</div>
		`,
	},
};

const passwordChangedEmailContent = {
	subject: '🚨 Password changed / Mot de passe modifié / تم تغيير كلمة المرور',
	html: (recoveryUrl, contactUrl) => `
	<div>
		<p lang="fr" dir="ltr"><strong>Une version française suit.</strong>strong></p>
		<p lang="ar" dir="rtl"><strong>وتليها أدناه نسخة باللغة العربية.</strong></p>
	<div>
		<hr>
		<div dir="ltr" lang="en">
			<p>Your password was changed. If you made this change, you can ignore this email.</p>
			<p>If you did not, <a href="${recoveryUrl}">reset your password</a> as soon as possible. If you cannot recover your account, <a href="${contactUrl}">contact us</a> and we will help you regain access.</p>
		</div>
		<hr>
		<div dir="ltr" lang="fr">
			<p>Votre mot de passe a été modifié. Si vous êtes à l’origine de ce changement, vous pouvez ignorer ce message.</p>
			<p>Si ce n’est pas vous, <a href="${recoveryUrl}">réinitialisez votre mot de passe</a> dès que possible. Si vous ne parvenez pas à récupérer votre compte, <a href="${contactUrl}">contactez-nous</a> et nous vous aiderons à y accéder de nouveau.</p>
		</div>
		<hr>
		<div dir="rtl" lang="ar">
			<p>تم تغيير كلمة مرور حسابك. إذا كنت أنت من أجريت هذا التغيير، فيمكنك تجاهل هذه الرسالة.</p>
			<p>إذا لم تكن أنت، <a href="${recoveryUrl}">فأعد تعيين كلمة مرورك</a> في أقرب وقت ممكن. إذا تعذّر عليك استعادة حسابك، <a href="${contactUrl}">فتواصل معنا</a> وسنساعدك على استعادة الوصول إليه.</p>
		</div>
	`,
	text: (recoveryUrl, contactUrl) => `Une version française suit.
وتليها أدناه نسخة باللغة العربية.

Your password was changed. If you made this change, you can ignore this email.
If you did not, reset your password as soon as possible: ${recoveryUrl}
If you cannot recover your account, contact us: ${contactUrl}

Votre mot de passe a été modifié. Si vous êtes à l’origine de ce changement, vous pouvez ignorer ce message.
Si ce n’est pas vous, réinitialisez votre mot de passe dès que possible : ${recoveryUrl}
Si vous ne parvenez pas à récupérer votre compte, contactez-nous : ${contactUrl}

تم تغيير كلمة مرور حسابك. إذا كنت أنت من أجريت هذا التغيير، فيمكنك تجاهل هذه الرسالة.
إذا لم تكن أنت، فأعد تعيين كلمة مرورك في أقرب وقت ممكن: ${recoveryUrl}
إذا تعذّر عليك استعادة حسابك، فتواصل معنا: ${contactUrl}`,
};

export default {
	signupEmailContent,
	resetPasswordEmailContent,
	accountDeletionEmailContent,
	passwordChangedEmailContent,
};
