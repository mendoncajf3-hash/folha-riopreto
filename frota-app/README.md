# Frota App — Vistoria de Veículos

## Estrutura do Projeto

```
frota-app/
├── mobile/          # App Android (React Native)
├── web/             # Painel do Gestor (React + MUI)
└── supabase/        # Banco de dados e storage
    └── migrations/  # SQL para criar as tabelas
```

## Como rodar

### 1. Supabase
- Crie um projeto em supabase.com
- Execute o arquivo `supabase/migrations/001_initial_schema.sql`
- Crie um bucket de storage chamado `fotos-vistoria` (público)
- Copie a URL e a chave anon do projeto

### 2. App Mobile (Android)
```bash
cd mobile
npm install
# Configure as variáveis em src/services/supabase.js
npx react-native run-android
```

### 3. Painel Web (Gestor)
```bash
cd web
npm install
npm run dev
```

## Fluxo do App

1. **Login** — colaborador entra com e-mail/senha
2. **Seleciona o veículo** — lista de carros disponíveis
3. **Tira as fotos** — frente, traseira, lateral esquerda, lateral direita (obrigatórias)
4. **Preenche checklist** — marca avarias existentes com descrição
5. **Assina digitalmente** — confirma a vistoria
6. **Usa o carro**
7. **Devolução** — repete fotos + checklist + km + assinatura

## Tecnologias
- React Native (Android)
- Supabase (banco PostgreSQL + storage de fotos + autenticação)
- React + Material UI (painel web)
