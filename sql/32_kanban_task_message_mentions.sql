--! sql/32_kanban_task_message_mentions.sql

CREATE TABLE IF NOT EXISTS kanban_task_message_mentions (
	task_message_id UUID NOT NULL
		REFERENCES kanban_task_messages(id) ON DELETE CASCADE,
	mentioned_user_id UUID NOT NULL
		REFERENCES users(id) ON DELETE CASCADE,
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	PRIMARY KEY (task_message_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS kanban_task_message_mentions_by_user
	ON kanban_task_message_mentions(mentioned_user_id, created_at);
