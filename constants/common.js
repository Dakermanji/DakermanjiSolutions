//! constants/common.js

export const MAX_IDENTIFIER_LENGTH = 254;

// Username: 3–20 allowed characters, including at least two ASCII letters.
export const USERNAME_REGEX = /^(?=(?:.*[a-zA-Z]){2})[a-zA-Z0-9_.-]{3,20}$/;

// Password: at least 8 characters with upper, lower, number, and symbol.
export const PASSWORD_REGEX =
	/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@$%^&*()\[\]{}\-_=<>.,:;'"\~`#\\|\/+])[A-Za-z\d!@$%^&*()\[\]{}\-_=<>.,:;'"\~`#\\|\/+]{8,}$/;
