#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Setup completo VPS - Sistema LEC Rio Preto + Agente WhatsApp
# Executar como root: bash setup-vps.sh
# ─────────────────────────────────────────────────────────────────────────────

set -e

PASTA="/root/folha-riopreto"
REPO="https://github.com/mendoncajf3-hash/folha-riopreto"

echo "═══════════════════════════════════════════════════════"
echo "  Sistema LEC Rio Preto — Setup VPS"
echo "═══════════════════════════════════════════════════════"

# 1. Node.js via NVM (se não instalado)
if ! command -v node &>/dev/null; then
  echo "📦 Instalando Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✓ Node.js $(node --version)"

# 2. PM2 global (se não instalado)
if ! command -v pm2 &>/dev/null; then
  echo "📦 Instalando PM2..."
  npm install -g pm2
fi
echo "✓ PM2 $(pm2 --version)"

# 3. Clonar ou atualizar repositório
if [ -d "$PASTA" ]; then
  echo "🔄 Atualizando repositório..."
  cd "$PASTA"
  git pull origin main
else
  echo "📥 Clonando repositório..."
  git clone "$REPO" "$PASTA"
  cd "$PASTA"
fi

# 4. Instalar dependências
echo "📦 Instalando dependências Node..."
npm install

# 5. Criar database.json se não existir
if [ ! -f "$PASTA/database.json" ]; then
  echo "🗄️  Criando database.json inicial..."
  cp "$PASTA/db.json" "$PASTA/database.json" 2>/dev/null || \
  echo '{"cadastro":[],"eventos":[],"config":{},"calendario":{}}' > "$PASTA/database.json"
fi

# 6. Iniciar/reiniciar serviço principal com PM2
echo "🚀 Iniciando sistema principal..."
pm2 describe folha-riopreto &>/dev/null && pm2 restart folha-riopreto || \
  pm2 start server_riopreto.js --name folha-riopreto

# 7. Verificar se agente WhatsApp já está rodando
if pm2 describe folha-zap &>/dev/null; then
  echo "♻️  Reiniciando agente WhatsApp..."
  pm2 restart folha-zap
else
  echo ""
  echo "═══════════════════════════════════════════════════════"
  echo "  AGENTE WHATSAPP — Primeira configuração"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "  Antes de iniciar o agente, edite o arquivo:"
  echo "  $PASTA/whatsapp-config.json"
  echo ""
  echo "  Adicione seus números no campo 'admins':"
  echo '  "admins": ["5517999999999"]'
  echo "  (Formato: 55 + DDD + número, sem espaços)"
  echo ""
  echo "  Para iniciar o agente:"
  echo "  pm2 start $PASTA/whatsapp-agent.js --name folha-zap"
  echo "  pm2 logs folha-zap   ← para ver o QR Code"
  echo ""
fi

# 8. Salvar configuração PM2 para reinício automático
pm2 save
pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Setup concluído!"
echo ""
echo "  Sistema principal: http://2.24.97.244:3001"
echo "  PM2 status:        pm2 status"
echo "  Logs sistema:      pm2 logs folha-riopreto"
echo "  Logs WhatsApp:     pm2 logs folha-zap"
echo "═══════════════════════════════════════════════════════"
