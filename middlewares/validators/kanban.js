//! middlewares/validators/kanban.js

import { fail } from '../../services/http/response.js';
import { isValidUuid } from './common.js';

export const PROJECT_NAME_MAX_LENGTH = 160;
export const PROJECT_DESCRIPTION_MAX_LENGTH = 2000;

export function parseProjectInput(input) {
	const source = input && typeof input === 'object' && !Array.isArray(input)
		? input
		: {};
	const name = typeof source.name === 'string'
		? source.name.normalize('NFKC').trim()
		: '';
	const description = typeof source.description === 'string'
		? source.description.normalize('NFKC').trim()
		: '';

	return {
		values: { name, description },
		valid: (source.description == null || typeof source.description === 'string') &&
			name.length > 0 && name.length <= PROJECT_NAME_MAX_LENGTH &&
			description.length <= PROJECT_DESCRIPTION_MAX_LENGTH,
	};
}

export function validateCreateProject(req, res, next) {
	if (!isValidUuid(req.user?.id)) return res.sendStatus(401);
	const result = parseProjectInput(req.body);
	if (!result.valid) {
		return fail(req, res, 'kanban:error.invalidProject', { to: '/kanban' });
	}
	req.kanbanProjectInput = {
		...result.values,
		ownerUserId: req.user.id,
	};
	return next();
}

export function validateProjectId(req, res, next) {
	if (!isValidUuid(req.params?.projectId)) return res.sendStatus(404);
	return next();
}
