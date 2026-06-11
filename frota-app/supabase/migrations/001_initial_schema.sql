-- Tabela de colaboradores/usuários
create table if not exists colaboradores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text unique not null,
  matricula text unique not null,
  cargo text,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Tabela de veículos
create table if not exists veiculos (
  id uuid primary key default gen_random_uuid(),
  placa text unique not null,
  modelo text not null,
  marca text not null,
  ano int,
  cor text,
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- Tabela de vistorias (registro de uso do carro)
create table if not exists vistorias (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references veiculos(id),
  colaborador_id uuid not null references colaboradores(id),

  -- Retirada
  km_retirada numeric,
  data_retirada timestamptz default now(),
  assinatura_retirada text,

  -- Devolução
  km_devolucao numeric,
  data_devolucao timestamptz,
  assinatura_devolucao text,
  observacao_devolucao text,

  status text default 'em_uso', -- em_uso | devolvido

  criado_em timestamptz default now()
);

-- Checklist de avarias na retirada
create table if not exists checklist_avarias (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references vistorias(id) on delete cascade,
  momento text not null, -- retirada | devolucao
  item text not null,    -- ex: "Para-choque dianteiro"
  avariado boolean default false,
  descricao text,
  criado_em timestamptz default now()
);

-- Fotos da vistoria
create table if not exists fotos_vistoria (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references vistorias(id) on delete cascade,
  momento text not null, -- retirada | devolucao
  angulo text not null,  -- frente | traseira | lateral_esquerda | lateral_direita
  url text not null,
  criado_em timestamptz default now()
);

-- RLS básico (Row Level Security)
alter table colaboradores enable row level security;
alter table veiculos enable row level security;
alter table vistorias enable row level security;
alter table checklist_avarias enable row level security;
alter table fotos_vistoria enable row level security;

-- Policies: leitura autenticada
create policy "leitura autenticada" on colaboradores for select using (auth.role() = 'authenticated');
create policy "leitura autenticada" on veiculos for select using (auth.role() = 'authenticated');
create policy "leitura autenticada" on vistorias for select using (auth.role() = 'authenticated');
create policy "leitura autenticada" on checklist_avarias for select using (auth.role() = 'authenticated');
create policy "leitura autenticada" on fotos_vistoria for select using (auth.role() = 'authenticated');

-- Policies: escrita autenticada
create policy "escrita autenticada" on vistorias for insert with check (auth.role() = 'authenticated');
create policy "escrita autenticada" on checklist_avarias for insert with check (auth.role() = 'authenticated');
create policy "escrita autenticada" on fotos_vistoria for insert with check (auth.role() = 'authenticated');
create policy "update autenticado" on vistorias for update using (auth.role() = 'authenticated');
