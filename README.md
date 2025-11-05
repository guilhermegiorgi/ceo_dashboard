# 🏃‍♂️ Execução Local - CEO Dashboard

## 📋 Pré-requisitos

- Node.js 16+ instalado
- npm ou pnpm
- Portas 3000 e 3002 livres

## ⚡ Execução Rápida

### **Linux/Mac:**
```bash
chmod +x start.sh
./start.sh
```

### **Windows:**
```cmd
start.bat
```

### **Manual:**
```bash
# Instalar dependências
pnpm install
# ou npm install

# Executar desenvolvimento
pnpm run dev
# ou npm run dev
```

## 🌐 URLs de Acesso

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3002
- **API Health:** http://localhost:3002/api/health

## 🔧 Funcionalidades Disponíveis

- ✅ Backend Express na porta 3002
- ✅ Frontend Next.js na porta 3000
- ✅ API endpoints funcionais
- ✅ Interface de chat básica
- ✅ WebSocket server

## 📝 Notas

- O stack foi testado e está funcionando
- Scripts automatizam instalação e execução
- Interface disponível em http://localhost:3000

## 🆘 Suporte

Se encontrar problemas:
1. Verifique se as portas 3000 e 3002 estão livres
2. Execute `npm install` para garantir dependências
3. Consulte logs do terminal para erros específicos