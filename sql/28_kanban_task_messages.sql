--! sql/28_kanban_task_messages.sql

CREATE TABLE IF NOT EXISTS kanban_task_messages (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    author_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    -- Preserve the displayed role if membership changes later.
    author_role VARCHAR(16) NOT NULL
        CHECK (author_role IN ('owner', 'admin', 'editor', 'observer')),
    body TEXT NOT NULL CHECK (length(trim(body)) > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    edited_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS kanban_messages_by_task
    ON kanban_task_messages(task_id, created_at, id);
