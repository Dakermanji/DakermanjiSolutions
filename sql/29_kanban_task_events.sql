--! sql/29_kanban_task_events.sql

CREATE TABLE IF NOT EXISTS kanban_task_events (
    id UUID PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES kanban_tasks(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(40) NOT NULL CHECK (action IN (
        'created', 'edited', 'assigned', 'reassigned', 'unassigned',
        'status_changed', 'archived', 'restored'
    )),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kanban_events_by_task
    ON kanban_task_events(task_id, created_at, id);
