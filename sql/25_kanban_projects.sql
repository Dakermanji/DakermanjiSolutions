--! sql/25_kanban_projects.sql

CREATE TABLE IF NOT EXISTS kanban_projects (
    id UUID PRIMARY KEY,
    name VARCHAR(160) NOT NULL CHECK (length(trim(name)) > 0),
    description TEXT NOT NULL DEFAULT '',
    -- Account deletion retains shared project data until ownership is resolved.
    -- Normal ownership changes must update this field and member roles together.
    owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
