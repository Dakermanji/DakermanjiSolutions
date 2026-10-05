--! sql/30_kanban_project_invitations.sql

CREATE TABLE IF NOT EXISTS kanban_project_invitations (
    id UUID PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES kanban_projects(id) ON DELETE CASCADE,
    -- Keep a request for every valid identifier, even when no account matches.
    -- Never expose whether this field is NULL to the project owner.
    invitee_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    inviter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    requested_identifier VARCHAR(320) NOT NULL
        CHECK (length(trim(requested_identifier)) > 0),
    role VARCHAR(16) NOT NULL CHECK (role IN ('admin', 'editor', 'observer')),
    status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    responded_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    CONSTRAINT kanban_invitation_expiry_after_creation
        CHECK (expires_at > created_at),
    CONSTRAINT kanban_invitation_response_state CHECK (
        (status = 'pending' AND responded_at IS NULL AND cancelled_at IS NULL)
        OR (status IN ('accepted', 'declined') AND responded_at IS NOT NULL
            AND responded_at <= expires_at AND cancelled_at IS NULL)
        OR (status = 'cancelled' AND cancelled_at IS NOT NULL)
        OR (status = 'expired' AND cancelled_at IS NULL)
    )
);

-- A declined request remains indistinguishable from a pending one to the owner.
-- The application marks expired requests before allowing another for the same input.
CREATE UNIQUE INDEX IF NOT EXISTS kanban_one_open_invitation_request
    ON kanban_project_invitations(project_id, requested_identifier)
    WHERE status IN ('pending', 'declined');
CREATE INDEX IF NOT EXISTS kanban_invitations_by_invitee
    ON kanban_project_invitations(invitee_user_id, status, expires_at)
    WHERE invitee_user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS kanban_invitations_by_project
    ON kanban_project_invitations(project_id, status, expires_at DESC);
