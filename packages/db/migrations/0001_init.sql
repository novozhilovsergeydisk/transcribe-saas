-- Initial schema for «Голос в текст» (transcribe_saas).
-- Native SQL, snake_case columns, text + CHECK instead of native enums,
-- uuid primary keys via gen_random_uuid(), updated_at maintained by trigger.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------- Users / Auth ----------

CREATE TABLE users (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email                     text NOT NULL UNIQUE,
  name                      text,
  password_hash             text,
  email_verified            timestamptz,
  image                     text,
  role                      text NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  privacy_accepted_at       timestamptz,
  personal_data_accepted_at timestamptz,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE accounts (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type                text NOT NULL,
  provider            text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token       text,
  access_token        text,
  expires_at          integer,
  token_type          text,
  scope               text,
  id_token            text,
  session_state       text,
  UNIQUE (provider, provider_account_id)
);
CREATE INDEX accounts_user_id_idx ON accounts(user_id);

CREATE TABLE sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires       timestamptz NOT NULL
);
CREATE INDEX sessions_user_id_idx ON sessions(user_id);

CREATE TABLE verification_tokens (
  identifier text NOT NULL,
  token      text NOT NULL UNIQUE,
  expires    timestamptz NOT NULL,
  UNIQUE (identifier, token)
);

-- ---------- Subscriptions & Billing ----------

CREATE TABLE subscriptions (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                    uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  plan                       text NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO', 'BUSINESS')),
  status                     text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PAST_DUE', 'CANCELED')),
  interval                   text NOT NULL DEFAULT 'MONTH' CHECK (interval IN ('MONTH', 'YEAR')),
  period_start               timestamptz NOT NULL DEFAULT now(),
  period_end                 timestamptz,
  cancel_at_period_end       boolean NOT NULL DEFAULT false,
  yookassa_payment_method_id text,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount      numeric(10, 2) NOT NULL,
  currency    text NOT NULL DEFAULT 'RUB',
  status      text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCEEDED', 'CANCELED', 'REFUNDED')),
  description text,
  yookassa_id text UNIQUE,
  plan        text CHECK (plan IN ('FREE', 'PRO', 'BUSINESS')),
  interval    text CHECK (interval IN ('MONTH', 'YEAR')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_user_id_idx ON payments(user_id);
CREATE TRIGGER payments_set_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Transcriptions ----------

CREATE TABLE transcriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        text NOT NULL,
  source       text NOT NULL CHECK (source IN ('UPLOAD', 'URL')),
  status       text NOT NULL DEFAULT 'PENDING'
               CHECK (status IN ('PENDING', 'DOWNLOADING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  source_url   text,
  file_key     text,
  mime_type    text,
  file_size    integer,
  duration_sec double precision,
  language     text,
  progress     integer NOT NULL DEFAULT 0,
  text         text,
  segments     jsonb,
  error        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX transcriptions_user_created_idx ON transcriptions(user_id, created_at DESC);
CREATE INDEX transcriptions_status_idx ON transcriptions(status);
CREATE TRIGGER transcriptions_set_updated_at BEFORE UPDATE ON transcriptions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------- Usage accounting ----------

CREATE TABLE usage_records (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period_start timestamptz NOT NULL,
  period_end   timestamptz NOT NULL,
  seconds_used integer NOT NULL DEFAULT 0,
  UNIQUE (user_id, period_start)
);
CREATE INDEX usage_records_user_id_idx ON usage_records(user_id);

-- ---------- API keys (Business) ----------

CREATE TABLE api_keys (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         text NOT NULL,
  prefix       text NOT NULL,
  key_hash     text NOT NULL UNIQUE,
  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX api_keys_user_id_idx ON api_keys(user_id);
