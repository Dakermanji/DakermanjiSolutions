--! sql/26_kanban_project_members.sql

CREATE TABLE IF NOT EXISTS kanban_project_members (
    project_id UUID NOT NULL REFERENCES kanban_projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(16) NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'observer')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (project_id, user_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS kanban_one_owner_per_project
    ON kanban_project_members(project_id) WHERE role = 'owner';
CREATE INDEX IF NOT EXISTS kanban_members_by_user
    ON kanban_project_members(user_id, project_id);
