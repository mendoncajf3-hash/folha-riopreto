-- ═══════════════════════════════════════════════════════════════
-- Sistema de Controle de Excesso de Velocidade
-- Migration 001 - Schema completo
-- ═══════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ───────────────────────────────────────────────
-- EMPRESAS
-- ───────────────────────────────────────────────
CREATE TABLE companies (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       VARCHAR(200) NOT NULL,
  cnpj       VARCHAR(18),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- BASES / FILIAIS
-- ───────────────────────────────────────────────
CREATE TABLE bases (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  city       VARCHAR(100),
  state      VARCHAR(2) DEFAULT 'SP',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- FUNCIONÁRIOS
-- ───────────────────────────────────────────────
CREATE TABLE employees (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID REFERENCES companies(id),
  base_id      UUID REFERENCES bases(id),
  registration VARCHAR(20) UNIQUE NOT NULL,
  name         VARCHAR(200) NOT NULL,
  role         VARCHAR(100),
  phone        VARCHAR(20),
  whatsapp     VARCHAR(20),
  cost_center  VARCHAR(10),
  hired_at     DATE,
  status       VARCHAR(20) DEFAULT 'ACTIVE'
                 CHECK (status IN ('ACTIVE','INACTIVE','TERMINATED')),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_employees_name         ON employees USING gin(name gin_trgm_ops);
CREATE INDEX idx_employees_registration ON employees(registration);
CREATE INDEX idx_employees_base_id      ON employees(base_id);
CREATE INDEX idx_employees_status       ON employees(status);

-- ───────────────────────────────────────────────
-- VEÍCULOS
-- ───────────────────────────────────────────────
CREATE TABLE vehicles (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id),
  base_id    UUID REFERENCES bases(id),
  plate      VARCHAR(10) UNIQUE NOT NULL,
  model      VARCHAR(100),
  brand      VARCHAR(100),
  year       SMALLINT,
  tracker_id VARCHAR(50),
  active     BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vehicles_plate   ON vehicles(plate);
CREATE INDEX idx_vehicles_base_id ON vehicles(base_id);

-- ───────────────────────────────────────────────
-- VINCULAÇÃO FUNCIONÁRIO <-> VEÍCULO
-- ───────────────────────────────────────────────
CREATE TABLE vehicle_assignments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id    UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  employee_id   UUID REFERENCES employees(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ DEFAULT NOW(),
  unassigned_at TIMESTAMPTZ
);

-- ───────────────────────────────────────────────
-- USUÁRIOS DO SISTEMA
-- ───────────────────────────────────────────────
CREATE TABLE system_users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id   UUID REFERENCES employees(id),
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(200) NOT NULL,
  role          VARCHAR(20) DEFAULT 'VIEWER'
                  CHECK (role IN ('SUPERADMIN','ADMIN','MANAGER','VIEWER')),
  active        BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- E-MAILS BRUTOS (tudo que chega do Gmail)
-- ───────────────────────────────────────────────
CREATE TABLE raw_emails (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gmail_message_id VARCHAR(100) UNIQUE,
  received_at      TIMESTAMPTZ,
  subject          TEXT,
  sender           VARCHAR(200),
  body_html        TEXT,
  body_text        TEXT,
  processed        BOOLEAN DEFAULT false,
  processed_at     TIMESTAMPTZ,
  error            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_raw_emails_processed   ON raw_emails(processed);
CREATE INDEX idx_raw_emails_received_at ON raw_emails(received_at DESC);

-- ───────────────────────────────────────────────
-- ALERTAS DE VELOCIDADE (processados)
-- ───────────────────────────────────────────────
CREATE TABLE speed_alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_email_id    UUID REFERENCES raw_emails(id),
  alert_number    VARCHAR(50),
  employee_id     UUID REFERENCES employees(id),
  vehicle_id      UUID REFERENCES vehicles(id),
  base_id         UUID REFERENCES bases(id),
  occurred_at     TIMESTAMPTZ NOT NULL,
  recorded_speed  SMALLINT NOT NULL,
  speed_limit     SMALLINT NOT NULL,
  excess_speed    SMALLINT GENERATED ALWAYS AS (recorded_speed - speed_limit) STORED,
  city            VARCHAR(100),
  address         TEXT,
  latitude        DECIMAL(10,8),
  longitude       DECIMAL(11,8),
  map_link        TEXT,
  company_name    VARCHAR(200),
  extra_data      JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_occurred_at  ON speed_alerts(occurred_at DESC);
CREATE INDEX idx_alerts_employee_id  ON speed_alerts(employee_id);
CREATE INDEX idx_alerts_vehicle_id   ON speed_alerts(vehicle_id);
CREATE INDEX idx_alerts_base_id      ON speed_alerts(base_id);
CREATE INDEX idx_alerts_alert_number ON speed_alerts(alert_number);

-- ───────────────────────────────────────────────
-- INFRAÇÕES (camada de negócio sobre os alertas)
-- ───────────────────────────────────────────────
CREATE TABLE infractions (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id          UUID REFERENCES speed_alerts(id) ON DELETE CASCADE,
  employee_id       UUID REFERENCES employees(id),
  vehicle_id        UUID REFERENCES vehicles(id),
  occurrence_number SMALLINT NOT NULL DEFAULT 1,
  severity          VARCHAR(20) DEFAULT 'LOW'
                      CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  status            VARCHAR(20) DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','NOTIFIED','ACKNOWLEDGED','ESCALATED')),
  period_start      DATE,
  period_end        DATE,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_infractions_employee_id ON infractions(employee_id);
CREATE INDEX idx_infractions_status      ON infractions(status);
CREATE INDEX idx_infractions_period      ON infractions(period_start, period_end);

-- ───────────────────────────────────────────────
-- MENSAGENS WHATSAPP
-- ───────────────────────────────────────────────
CREATE TABLE whatsapp_messages (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  infraction_id        UUID REFERENCES infractions(id),
  employee_id          UUID REFERENCES employees(id),
  phone                VARCHAR(20) NOT NULL,
  message_text         TEXT NOT NULL,
  sent_at              TIMESTAMPTZ,
  status               VARCHAR(20) DEFAULT 'PENDING'
                         CHECK (status IN ('PENDING','SENT','DELIVERED','READ','FAILED')),
  error                TEXT,
  evolution_message_id VARCHAR(100),
  ai_generated         BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_employee_id ON whatsapp_messages(employee_id);
CREATE INDEX idx_whatsapp_status      ON whatsapp_messages(status);

-- ───────────────────────────────────────────────
-- TEMPLATES DE MENSAGEM
-- ───────────────────────────────────────────────
CREATE TABLE message_templates (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  occurrence_number SMALLINT NOT NULL,
  tone              VARCHAR(50) NOT NULL,
  template_text     TEXT NOT NULL,
  use_ai            BOOLEAN DEFAULT false,
  active            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ───────────────────────────────────────────────
-- CONFIGURAÇÕES DO SISTEMA
-- ───────────────────────────────────────────────
CREATE TABLE system_config (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT,
  label      VARCHAR(200),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES system_users(id)
);

-- ───────────────────────────────────────────────
-- LOGS DE AUDITORIA
-- ───────────────────────────────────────────────
CREATE TABLE audit_logs (
  id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id   UUID REFERENCES system_users(id),
  username  VARCHAR(50),
  action    VARCHAR(100) NOT NULL,
  entity    VARCHAR(100),
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  ip        VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_user_id    ON audit_logs(user_id);

-- ───────────────────────────────────────────────
-- TABELA DE CONTROLE DE MIGRATIONS
-- ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schema_migrations (
  version    VARCHAR(10) PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO schema_migrations (version) VALUES ('001');
