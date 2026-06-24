#!/bin/bash
cd /root/folha-riopreto

# Baixar HTML
curl -L "https://raw.githubusercontent.com/mendoncajf3-hash/folha-riopreto/main/SistemaLEC_RioPreto_Final.html" -o public/index.html

# Baixar server.js
curl -L "https://raw.githubusercontent.com/mendoncajf3-hash/folha-riopreto/main/server_riopreto.js" -o server.js

# Baixar agente WhatsApp
curl -L "https://raw.githubusercontent.com/mendoncajf3-hash/folha-riopreto/main/whatsapp-agent.js" -o whatsapp-agent.js

# Instalar dependências
npm install --save 2>/dev/null

# Reiniciar sistema principal
pm2 restart folha-riopreto

# Reiniciar agente WhatsApp (se estiver rodando)
pm2 describe folha-zap &>/dev/null && pm2 restart folha-zap || true

echo "✅ Rio Preto atualizado!"
