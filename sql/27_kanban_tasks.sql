--! sql/27_kanban_tasks.sql

CREATE TABLE IF NOT EXISTS kanban_tasks (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES kanban_projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'done')),
    position INTEGER NOT NULL DEFAULT 0 CHECK (position >= 0),
    creator_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    assignee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kanban_tasks_by_project_stage
    ON kanban_tasks(project_id, status, position, created_at)
    WHERE archived_at IS NULL;
CREATE INDEX IF NOT EXISTS kanban_tasks_by_assignee
    ON kanban_tasks(assignee_user_id, project_id)
    WHERE archived_at IS NULL;
