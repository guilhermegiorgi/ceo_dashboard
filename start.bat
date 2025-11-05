@echo off
chcp 65001 >nul

REM Script de execução automática Windows
REM CEO Dashboard MVP Critical Phase 1

title CEO Dashboard - Execução Local

echo 🚀 Iniciando CEO Dashboard...
echo ================================

REM Verificar Node.js
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado. Instale Node.js 16+ primeiro.
    pause
    exit /b 1
)

echo ✅ Node.js encontrado:
node --version

REM Verificar npm
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm não encontrado.
    pause
    exit /b 1
)

echo ✅ npm encontrado:
npm --version

echo.
echo 📦 Instalando dependências...
npm install

echo.
echo 🏃‍♂️ Iniciando desenvolvimento...
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:3002
echo.
echo Pressione Ctrl+C para parar

REM Iniciar desenvolvimento
npm run dev

pause