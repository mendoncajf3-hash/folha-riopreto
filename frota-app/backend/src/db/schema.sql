-- Extensão para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  matricula TEXT UNIQUE NOT NULL,
  cargo TEXT,
  perfil TEXT DEFAULT 'colaborador', -- colaborador | gestor
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Veículos
CREATE TABLE IF NOT EXISTS veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa TEXT UNIQUE NOT NULL,
  modelo TEXT NOT NULL,
  marca TEXT NOT NULL,
  ano INT,
  cor TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Vistorias
CREATE TABLE IF NOT EXISTS vistorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID NOT NULL REFERENCES veiculos(id),
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id),
  km_retirada NUMERIC,
  km_devolucao NUMERIC,
  data_retirada TIMESTAMPTZ DEFAULT NOW(),
  data_devolucao TIMESTAMPTZ,
  observacao_devolucao TEXT,
  assinatura_retirada TEXT,
  assinatura_devolucao TEXT,
  status TEXT DEFAULT 'em_uso',
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Checklist de avarias
CREATE TABLE IF NOT EXISTS checklist_avarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vistoria_id UUID NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
  momento TEXT NOT NULL,
  item TEXT NOT NULL,
  avariado BOOLEAN DEFAULT false,
  descricao TEXT,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Fotos
CREATE TABLE IF NOT EXISTS fotos_vistoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vistoria_id UUID NOT NULL REFERENCES vistorias(id) ON DELETE CASCADE,
  momento TEXT NOT NULL,
  angulo TEXT NOT NULL,
  url TEXT NOT NULL,
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_vistorias_veiculo ON vistorias(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_colaborador ON vistorias(colaborador_id);
CREATE INDEX IF NOT EXISTS idx_vistorias_status ON vistorias(status);
CREATE INDEX IF NOT EXISTS idx_checklist_vistoria ON checklist_avarias(vistoria_id);
CREATE INDEX IF NOT EXISTS idx_fotos_vistoria ON fotos_vistoria(vistoria_id);
