//! middlewares/validators/auth.js

export {
	validateSignIn,
	validateResetPassword,
} from './auth/credentials.js';
export {
	validateEmailField,
	validateSignupEmail,
	validateRecoveryEmail,
	validateRecoveryIntent,
} from './auth/email.js';
export {
	validateTokenAndLangQuery,
	validateVerifyEmailQuery,
	validateResetPasswordQuery,
} from './auth/links.js';
export {
	validateCompleteLocalSignup,
	validateSetUsername,
} from './auth/signup.js';
