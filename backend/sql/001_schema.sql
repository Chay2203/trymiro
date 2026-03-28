CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE api_keys (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash   TEXT UNIQUE NOT NULL,
  shop       TEXT NOT NULL,
  mode       TEXT NOT NULL CHECK (mode IN ('live', 'test')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE abandoned_checkouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop            TEXT NOT NULL,
  checkout_token  TEXT UNIQUE NOT NULL,
  email           TEXT,
  phone           TEXT,
  cart_value      NUMERIC(10,2),
  cart_items      JSONB,
  status          TEXT NOT NULL DEFAULT 'captured'
                    CHECK (status IN ('captured', 'recovery_attempted', 'recovered', 'converted')),
  captured_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  recovery_at     TIMESTAMPTZ,
  converted_at    TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_key_hash           ON api_keys (key_hash);
CREATE INDEX idx_abandoned_checkouts_status  ON abandoned_checkouts (status);
CREATE INDEX idx_abandoned_checkouts_shop    ON abandoned_checkouts (shop);
CREATE INDEX idx_abandoned_checkouts_captured ON abandoned_checkouts (captured_at);
CREATE INDEX idx_abandoned_checkouts_token   ON abandoned_checkouts (checkout_token);
