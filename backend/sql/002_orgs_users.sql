-- Multi-tenant: organizations + users tables, add org_id FK to existing tables

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- org_id nullable so ALTER doesn't fail on existing rows
ALTER TABLE api_keys ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE abandoned_checkouts ADD COLUMN org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Composite index for dashboard queries
CREATE INDEX idx_abandoned_checkouts_org_status ON abandoned_checkouts (org_id, status);
