# GG.AI CEO Dashboard

Um dashboard executivo multi-tenant que se integra ao seu Segundo Cérebro exposto pelo **Obsidian Brain Cloud** (OBC) para gerar insights estratégicos com IA.  
O CEO Dashboard nunca acessa o filesystem do vault diretamente; todas as operações acontecem via APIs REST e MCP fornecidas pelo OBC.

## 🚀 Visão Geral

Este dashboard permite que CEOs e executivos acessem informações estratégicas baseadas em suas anotações pessoais, com recursos avançados de IA para análise e geração de insights.

## ✨ Funcionalidades

- **Insights Estratégicos**: Geração automática de insights a partir das notas do OBC
- **Chat com IA**: Interface de conversação integrada ao Cognito (serviço de IA)
- **Sessões Persistentes**: Manutenção de contexto entre interações
- **Snapshot em Tempo Real**: Painel consome `/api/dashboard/today`, que agrega foco diário, contexto temporal, tarefas críticas e status de agentes diretamente do OBC
- **Workspaces Multi-Tenant**: Headers `X-Tenant-*` enviados para isolar workspaces do OBC (beta)
- **Cache Inteligente**: Melhora de desempenho com cache Redis
- **Segurança Avançada**: Autenticação JWT e proteção contra ataques comuns
- **Documentação Completa**: API documentada com OpenAPI (Swagger) e referências MCP

## 🛠 Tecnologias

### Backend
- Node.js com Express
- Redis para cache
- JWT para autenticação
- WebSockets para atualizações em tempo real
- Integração com Obsidian Brain Cloud (FastAPI + FastMCP) e Cognito

### Frontend
- React com TypeScript
- Vite para build e desenvolvimento
- Tailwind CSS para estilização
- React Query para gerenciamento de estado
- Chart.js para visualizações

## 🚀 Começando

### Pré-requisitos

- Node.js 18+
- Redis
- Instância do Obsidian Brain Cloud ≥ **1.1.0** (modo multi-tenant habilitado opcionalmente)
- Acesso ao serviço Cognito

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/ceo-dashboard.git
   cd ceo-dashboard
   ```

2. Instale as dependências do servidor:
   ```bash
   cd server
   npm install
   ```

3. Configure as variáveis de ambiente (opcional):
   ```bash
   cp .env.example .env
   # Edite o arquivo .env com suas configurações
   ```

   > ⚙️ **Configuração via UI** – A tela **Configurações → Obsidian Brain Cloud** salva `baseUrl`, token, tenant e endpoints MCP em `data/settings.json`. Os valores podem ser testados (REST/MCP) diretamente pela interface e têm precedência sobre o `.env`.

   - Valores de fallback (`BRAINCLOUD_BASE_URL`, `BRAINCLOUD_API_TOKEN`, `BRAINCLOUD_TENANT_*`) ainda podem ser definidos no `.env`.
   - Consulte `docs/INTEGRACAO_OBSIDIAN_BRAIN_CLOUD.md` para detalhes da integração e exemplo de payloads.
   - Referências REST/MCP completas: repositório `../PLATAFORMAS/obsidian-brain-cloud`.

   Ferramentas externas (busca e APIs):
   ```
   TAVILY_API_KEY=seu_token_tavily    # recomendado
   # ou
   SERPAPI_KEY=seu_token_serpapi
   ```

4. Inicie o servidor:
   ```bash
   npm run dev
   ```

5. Em outro terminal, instale e inicie o frontend:
   ```bash
   cd ../client
   npm install
   npm run dev
   ```

6. Acesse a aplicação em `http://localhost:5173`

## 📂 Integração com Obsidian Brain Cloud

- **Fluxos principais**: criação de insights, sincronização Git, busca avançada, notas periódicas, contexto temporal e snapshot diário utilizam a REST API exposta pelo OBC.
- **Snapshot `/api/dashboard/today`**: o backend consolida foco diário, contexto temporal, tarefas e status dos agentes a partir das rotas `/api/v1/focus/current`, `/api/v1/context/time`, `/api/v1/tasks/*` e `/api/v1/mcp/*`.
- **Multi-Tenant**: defina `BRAINCLOUD_TENANT_*` para propagar `X-Tenant-*` nas requisições e isolar workspaces (beta).
- **Somente via API/MCP**: o dashboard nunca monta ou escreve diretamente no filesystem do vault; toda interação ocorre via endpoints REST/MCP do OBC.
- **MCP / Agentes**: agentes conectados ao OBC podem consumir o mesmo vault via Model Context Protocol; veja `docs/mcp_reference.md` no repositório do OBC.
- Detalhes adicionais estão em `docs/INTEGRACAO_OBSIDIAN_BRAIN_CLOUD.md`.

## 📚 Documentação da API

- Swagger UI do dashboard: `http://localhost:3001/api-docs`
- Esquema OpenAPI: `/server/docs/openapi.yaml`
- Snapshot consolidado do dashboard: `GET /api/dashboard/today`
- Referências do OBC (REST + MCP): acesse `../PLATAFORMAS/obsidian-brain-cloud/docs/api_reference.md` e `../PLATAFORMAS/obsidian-brain-cloud/docs/mcp_reference.md`

## 🔒 Segurança

- Todas as rotas (exceto /health) requerem autenticação via JWT
- Rate limiting implementado para prevenir abusos
- Headers de segurança habilitados via Helmet
- CORS configurado para origens específicas

## 📊 Estrutura do Projeto

```
ceo-dashboard/
├── client/                 # Frontend React
├── server/                 # Backend Node.js/Express
│   ├── config/            # Configurações
│   ├── controllers/        # Lógica dos controladores
│   ├── middleware/        # Middlewares do Express
│   ├── models/            # Modelos de dados
│   ├── routes/            # Definição de rotas
│   ├── services/          # Serviços e lógica de negócio
│   ├── utils/             # Utilitários
│   ├── .env.example       # Exemplo de variáveis de ambiente
│   ├── index.js           # Ponto de entrada do servidor
│   └── package.json
└── README.md
```

## 🤝 Contribuição

1. Faça um Fork do projeto
2. Crie uma Branch para sua Feature (`git checkout -b feature/AmazingFeature`)
3. Adicione suas mudanças (`git add .`)
4. Comite suas mudanças (`git commit -m 'Add some AmazingFeature'`)
5. Faça o Push da Branch (`git push origin feature/AmazingFeature`)
6. Abra um Pull Request

## 🚀 Implantação

Para instruções completas de implantação, incluindo configuração de VPS, backup automático e monitoramento, consulte:

📖 **[Guia de Implantação Completo](docs/DEPLOYMENT.md)**

### Recursos de Implantação
- 🐳 Dockerização completa
- ☁️ Deploy em VPS com Nginx + SSL
- 🔄 Backup automático do vault Obsidian
- 📊 Monitoramento com Prometheus + Grafana
- 🚀 CI/CD com GitHub Actions

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.

## 📧 Contato

GG.AI Labs - [GitHub](https://github.com/ggailabs) - contato@ggailabs.com

Link do Projeto: [https://github.com/ggailabs/ceo-dashboard](https://github.com/ggailabs/ceo-dashboard)
