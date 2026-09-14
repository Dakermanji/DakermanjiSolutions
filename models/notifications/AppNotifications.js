//! models/notifications/AppNotifications.js

import {
	create,
	createIfNotExists,
} from './appNotifications/create.js';
import {
	countUnreadByRecipient,
	findByIdForRecipient,
	findByRecipient,
} from './appNotifications/queries.js';
import {
	dismiss,
	dismissByEntityTypes,
	markAsRead,
	markManyAsRead,
	respond,
	respondAndDismissByEntity,
} from './appNotifications/state.js';

export {
	create,
	createIfNotExists,
} from './appNotifications/create.js';
export {
	countUnreadByRecipient,
	findByIdForRecipient,
	findByRecipient,
} from './appNotifications/queries.js';
export {
	dismiss,
	dismissByEntityTypes,
	markAsRead,
	markManyAsRead,
	respond,
	respondAndDismissByEntity,
} from './appNotifications/state.js';

export default {
	countUnreadByRecipient,
	create,
	createIfNotExists,
	dismiss,
	dismissByEntityTypes,
	findByIdForRecipient,
	findByRecipient,
	markAsRead,
	markManyAsRead,
	respond,
	respondAndDismissByEntity,
};
