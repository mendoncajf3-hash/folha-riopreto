#!/bin/bash
# Script de deploy para VPS Hostinger
# Execute: bash deploy.sh

set -e

echo "=== Frota App — Deploy ==="

# Verifica Docker
if ! command -v docker &> /dev/null; then
  echo "Instalando Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
fi

# Verifica Docker Compose
if ! command -v docker compose &> /dev/null; then
  echo "Instalando Docker Compose plugin..."
  apt-get install -y docker-compose-plugin
fi

# Cria .env do backend se não existir
if [ ! -f backend/.env ]; then
  echo "Criando backend/.env..."
  cp backend/.env.example backend/.env
  # Gera JWT_SECRET aleatório
  JWT=$(openssl rand -hex 32)
  sed -i "s/chave-secreta-muito-longa-e-aleatoria/$JWT/" backend/.env
  echo ""
  echo "ATENÇÃO: Edite o arquivo backend/.env e defina DB_PASSWORD e FRONTEND_URL"
  echo "  nano backend/.env"
  echo ""
  read -p "Pressione Enter após editar o .env para continuar..."
fi

# Cria .env do web se não existir
if [ ! -f web/.env ]; then
  echo "VITE_API_URL=/api" > web/.env
fi

echo "Fazendo build e subindo containers..."
docker compose down --remove-orphans
docker compose build --no-cache
docker compose up -d

echo ""
echo "=== Deploy concluído! ==="
echo "Painel web:  http://$(curl -s ifconfig.me)"
echo "API health:  http://$(curl -s ifconfig.me)/api/health"
echo ""
echo "Para ver os logs: docker compose logs -f"
echo "Para parar: docker compose down"
