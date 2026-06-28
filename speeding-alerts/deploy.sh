#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# Deploy do Sistema de Controle de Excesso de Velocidade
# Executar na VPS: bash deploy.sh
# ═══════════════════════════════════════════════════════════════

set -e

DEPLOY_DIR="/opt/speeding-alerts"
WEB_DIR="/var/www/speeding-alerts"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "═══════════════════════════════════════════════"
echo "  Deploy - Sistema de Velocidade LEC"
echo "═══════════════════════════════════════════════"

# 1. Criar diretórios
mkdir -p "$DEPLOY_DIR" "$WEB_DIR"

# 2. Copiar arquivos do servidor
cp -r "$SCRIPT_DIR"/* "$DEPLOY_DIR/" 2>/dev/null || true

# 3. Configurar .env se não existir
if [ ! -f "$DEPLOY_DIR/.env" ]; then
  echo ""
  echo "⚠️  Arquivo .env não encontrado."
  echo "   Copie o .env.example e configure as variáveis:"
  echo "   cp $DEPLOY_DIR/.env.example $DEPLOY_DIR/.env"
  echo "   nano $DEPLOY_DIR/.env"
  echo ""
  exit 1
fi

# 4. Build do frontend
echo "→ Construindo frontend React..."
cd "$SCRIPT_DIR/packages/web"
npm install --silent
npm run build
cp -r dist/* "$WEB_DIR/"
echo "✓ Frontend buildado em $WEB_DIR"

# 5. Instalar dependências da API
echo "→ Instalando dependências da API..."
cd "$SCRIPT_DIR/packages/api"
npm install --omit=dev --silent
echo "✓ Dependências instaladas"

# 6. Subir Docker (PostgreSQL + Redis)
echo "→ Iniciando containers..."
cd "$DEPLOY_DIR"
docker compose up -d postgres redis
echo "✓ Containers PostgreSQL e Redis ativos"

# 7. Aguardar banco ficar pronto
echo "→ Aguardando banco de dados..."
sleep 5

# 8. Iniciar API com pm2
echo "→ Iniciando API..."
if command -v pm2 &> /dev/null; then
  pm2 stop speeding-api 2>/dev/null || true
  pm2 delete speeding-api 2>/dev/null || true
  cd "$SCRIPT_DIR/packages/api"
  pm2 start src/index.js --name speeding-api --env production \
    --log /var/log/speeding-api.log \
    --error /var/log/speeding-api-error.log
  pm2 save
  echo "✓ API iniciada com pm2 na porta 3009"
else
  echo "⚠️  pm2 não encontrado. Instale: npm install -g pm2"
  echo "   Depois execute: pm2 start $SCRIPT_DIR/packages/api/src/index.js --name speeding-api"
fi

# 9. Configurar Nginx
echo "→ Configurando Nginx..."
if command -v nginx &> /dev/null; then
  NGINX_CONF="$SCRIPT_DIR/nginx/speeding.conf"
  cp "$NGINX_CONF" /etc/nginx/sites-available/speeding-alerts
  ln -sf /etc/nginx/sites-available/speeding-alerts /etc/nginx/sites-enabled/speeding-alerts
  nginx -t && systemctl reload nginx
  echo "✓ Nginx configurado"
else
  echo "⚠️  Nginx não encontrado. Configure manualmente."
  echo "   Config: $SCRIPT_DIR/nginx/speeding.conf"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ Deploy concluído!"
echo "  API:       http://$(hostname -I | awk '{print $1}'):3009"
echo "  Frontend:  http://$(hostname -I | awk '{print $1}')"
echo ""
echo "  Próximos passos:"
echo "  1. Importe os dados legados em: Admin → Importar Dados"
echo "  2. Configure os telefones dos funcionários"
echo "  3. Cadastre os veículos"
echo "  4. Aguarde os exemplos de e-mail para o parser"
echo "═══════════════════════════════════════════════"
