--! sql/31_kanban_project_events.sql

CREATE TABLE IF NOT EXISTS kanban_project_events (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES kanban_projects(id) ON DELETE CASCADE,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(40) NOT NULL CHECK (action IN (
        'created', 'edited', 'archived', 'restored',
        'invitation_requested', 'invitation_cancelled',
        'member_joined', 'member_role_changed', 'member_removed',
        'ownership_transferred'
    )),
    -- Invitation details must describe the request without revealing whether
    -- the identifier matched an account or whether the recipient declined.
    details JSONB NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(details) = 'object'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kanban_project_events_by_project
    ON kanban_project_events(project_id, created_at DESC, id DESC);
