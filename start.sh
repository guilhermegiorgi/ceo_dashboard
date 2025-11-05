#!/bin/bash

# Script de execução automática Linux/Mac
# CEO Dashboard MVP Critical Phase 1

set -e

echo "🚀 Iniciando CEO Dashboard..."
echo "================================"

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale Node.js 16+ primeiro."
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"

# Verificar npm
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado."
    exit 1
fi

echo "✅ npm encontrado: $(npm --version)"

# Navegar para diretório
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📁 Diretório: $SCRIPT_DIR"

# Verificar package.json
if [ ! -f "package.json" ]; then
    echo "❌ package.json não encontrado!"
    exit 1
fi

# Instalar dependências
echo ""
echo "📦 Instalando dependências..."
npm install

echo ""
echo "🏃‍♂️ Iniciando desenvolvimento..."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3002"
echo ""
echo "Pressione Ctrl+C para parar"

# Iniciar desenvolvimento
npm run dev