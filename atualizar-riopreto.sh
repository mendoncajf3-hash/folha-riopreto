#!/bin/bash
cd /root/folha-riopreto

# Baixar HTML
curl -L "https://raw.githubusercontent.com/mendoncajf3-hash/folha-riopreto/main/SistemaLEC_RioPreto_Final.html" -o public/index.html

# Baixar server.js
curl -L "https://raw.githubusercontent.com/mendoncajf3-hash/folha-riopreto/main/server_riopreto.js" -o server.js

# Instalar dependências se necessário
npm install express express-session --save 2>/dev/null

# Reiniciar
pm2 restart folha-riopreto

echo "✅ Rio Preto atualizado!"
