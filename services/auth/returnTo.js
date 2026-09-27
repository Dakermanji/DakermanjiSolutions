// Only portfolio applications are valid post-login destinations.
export function appReturnTo(value) {
	return ['/weather', '/chat'].includes(value) ? value : '/';
}
