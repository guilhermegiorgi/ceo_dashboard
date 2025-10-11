# Guia de Desenvolvimento

## Como Começar

### Pré-requisitos
- Node.js 18.0.0 ou superior
- npm 8.0.0 ou superior
- Git
- VS Code (recomendado)

### Configuração do Ambiente de Desenvolvimento

1. **Clonar e Instalar**
```bash
git clone <repository-url>
cd gg-ai-labs-dashboard
npm install
```

2. **Configuração de Ambiente**

   O projeto utiliza um único arquivo `.env` na raiz para gerenciar todas as variáveis de ambiente, tanto para o frontend quanto para o backend. Para começar, copie o arquivo de exemplo:

   ```bash
   cp .env.example .env
   ```

   Em seguida, edite o arquivo `.env` e preencha as variáveis com suas chaves de API e configurações locais. O arquivo contém as seguintes seções:

   ```env
   # Variáveis de Ambiente do Frontend
   VITE_API_BASE_URL=http://localhost:3001
   VITE_WEBSOCKET_URL=ws://localhost:3001

   # Variáveis de Ambiente do Backend
   PORT=3001
   NODE_ENV=development

   # Integração com Obsidian
   OBSIDIAN_API_URL=http://localhost:27123
   OBSIDIAN_API_KEY=your_obsidian_api_key
   OBSIDIAN_VAULT_NAME=your_vault_name

   # Serviços de IA
   EMBEDDINGS_API_URL=http://localhost:8000
   EMBEDDINGS_API_KEY=your_embeddings_api_key
   OPENAI_API_KEY=your_openai_api_key

   # Configuração do MCP
   MCP_ENDPOINT=ws://localhost:8080/mcp
   MCP_API_KEY=your_mcp_key

   # Banco de Dados
   DATABASE_URL=./data/dashboard.db
   REDIS_URL=redis://localhost:6379

   # Segurança
   JWT_SECRET=your_jwt_secret_key
   API_RATE_LIMIT=100

   # Monitoramento
   SENTRY_DSN=your_sentry_dsn
   LOG_LEVEL=info
   ```

3. **Iniciar Servidores de Desenvolvimento**

   O projeto é configurado para iniciar tanto o backend quanto o frontend simultaneamente com um único comando. A partir do diretório raiz, execute:

   ```bash
   npm run dev
   ```

   Este comando utilizará o `concurrently` para:
   - Iniciar o servidor backend com `nodemon` em `http://localhost:3001`.
   - Iniciar o servidor de desenvolvimento frontend com `vite` em `http://localhost:5173`.

4. **Abrir Navegador**
   Após a execução do comando, navegue para `http://localhost:5173`.

## Estrutura do Projeto

A arquitetura do projeto é dividida em duas partes principais: o `frontend` (construído com React e Vite) e o `backend` (um servidor Node.js/Express). A estrutura foi projetada para ser modular e escalável.

```
/ (Raiz do Projeto)
├── src/                     # Código-fonte do Frontend
├── server/                  # Código-fonte do Backend
├── docs/                    # Documentação do projeto
├── .env.example             # Arquivo de exemplo para variáveis de ambiente
├── package.json             # Dependências e scripts do projeto
└── vite.config.ts           # Configuração do Vite
```

### Estrutura do Frontend (`src/`)

```
src/
├── components/              # Componentes React de alta especialização
│   ├── AIAgentOrchestrator.tsx # Orquestrador de Agentes de IA
│   ├── BusinessIntelligenceHub.tsx # Hub de Inteligência de Negócios
│   ├── DecisionJournal.tsx      # Diário de Decisões Estratégicas
│   ├── KnowledgeGraphVisualizer.tsx # Visualizador do Grafo de Conhecimento
│   ├── ProactiveSynergyPanel.tsx  # Painel de Sinergia Proativa
│   └── ... (20+ outros componentes)
├── services/                # Camada de serviço do Frontend
│   └── apiClient.ts         # Cliente de API centralizado para comunicação com o backend
├── contexts/                # Contextos React (ex: LanguageContext)
├── hooks/                   # Hooks customizados (ex: useAPI)
├── types/                   # Definições de tipo TypeScript globais
└── App.tsx                  # Componente principal da aplicação
```

### Estrutura do Backend (`server/`)

```
server/
├── routes/                  # Definições de Rotas da API (Endpoints)
│   ├── insights.js          # Endpoints para insights de IA
│   ├── decisions.js         # Endpoints para o Diário de Decisões
│   ├── knowledgeGraph.js    # Endpoints para o Grafo de Conhecimento
│   ├── mcp.js               # Endpoints para o Protocolo de Contexto de Modelo
│   ├── obsidian.js          # Endpoints para interação com o Obsidian
│   ├── projects.js          # Endpoints para gerenciamento de projetos
│   └── sessions.js          # Endpoints para sessões estratégicas
├── services/                # Lógica de negócio e integrações do Backend
│   ├── aiService.js         # Integração com serviços de IA (ex: OpenAI)
│   ├── obsidianApi.js       # Serviço para comunicação com a API do Obsidian
│   ├── database.js          # Gerenciamento do banco de dados (SQLite)
│   ├── cache.js             # Serviço de cache (Redis)
│   ├── cognitoService.js    # Serviço legado ou especializado para Cognito
│   ├── background.js        # Tarefas em segundo plano (ex: geração de insights)
│   └── websocket.js         # Gerenciamento de conexões WebSocket
├── index.js                 # Ponto de entrada principal do servidor Express
└── package.json             # Dependências do servidor
```

## Fluxo de Trabalho de Desenvolvimento

### 1. Desenvolvimento de Funcionalidades
```bash
# Criar branch de funcionalidade
git checkout -b feature/nome-da-nova-funcionalidade

# Fazer alterações
# Testar alterações
npm run lint
npm run build

# Fazer commit das alterações
git add .
git commit -m "feat: adiciona descrição da nova funcionalidade"

# Enviar e criar PR
git push origin feature/nome-da-nova-funcionalidade
```

### 2. Diretrizes de Desenvolvimento de Componentes

#### Estrutura de Componentes
```typescript
// components/ExampleComponent.tsx
import React from 'react';
import { Icon } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface ExampleComponentProps {
  title: string;
  data: any[];
  onAction?: () => void;
}

const ExampleComponent: React.FC<ExampleComponentProps> = ({
  title,
  data,
  onAction
}) => {
  const { t } = useLanguage();

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <h2 className="text-xl font-bold text-white">{t(title)}</h2>
      {/* Conteúdo do componente */}
    </div>
  );
};

export default ExampleComponent;
```

#### Diretrizes de Estilização
- Use classes do Tailwind CSS
- Siga o esquema de cores estabelecido (fundos slate, detalhes em gradiente)
- Implemente estados de hover e transições
- Garanta um design responsivo
- Use `backdrop-blur` para efeitos de glassmorfismo

#### Diretrizes de TypeScript
- Defina interfaces para todas as props
- Use tipagem adequada para todas as funções
- Evite o tipo `any` sempre que possível
- Exporte tipos que possam ser reutilizados

### 3. Adicionando Novas Integrações

#### Passo 1: Criar Camada de Serviço
```typescript
// src/services/newService.ts
class NewService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_NEW_SERVICE_URL;
    this.apiKey = import.meta.env.VITE_NEW_SERVICE_KEY;
  }

  async fetchData() {
    // Implementação
  }
}

export default new NewService();
```

#### Passo 2: Criar Hook Customizado
```typescript
// src/hooks/useNewService.ts
import { useState, useEffect } from 'react';
import newService from '../services/newService';

export const useNewService = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await newService.fetchData();
        setData(result);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return { data, loading, error };
};
```

#### Passo 3: Criar Componente
```typescript
// src/components/NewServiceIntegration.tsx
import React from 'react';
import { useNewService } from '../hooks/useNewService';

const NewServiceIntegration: React.FC = () => {
  const { data, loading, error } = useNewService();

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error.message}</div>;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      {/* Implementação do componente */}
    </div>
  );
};

export default NewServiceIntegration;
```

## Qualidade do Código

### Linting e Formatação
```bash
# Executar ESLint para identificar problemas
npm run lint

# Tentar corrigir problemas automaticamente com ESLint
npm run lint -- --fix
```

A formatação do código é geralmente gerenciada por extensões do editor (como Prettier) no momento de salvar o arquivo.

### Verificação de Tipos
```bash
# Executar verificação do compilador TypeScript
npx tsc --noEmit
```

### Testes
```bash
# Executar testes unitários e de integração com Vitest
npm run test

# Executar testes end-to-end com Playwright
npm run test:e2e
```

## Internacionalização

### Adicionando Novas Traduções

1. **Atualizar Contexto de Idioma**
```typescript
// src/contexts/LanguageContext.tsx
const translations = {
  en: {
    'new.key': 'English text',
    // ... traduções existentes
  },
  pt: {
    'new.key': 'Texto em português',
    // ... traduções existentes
  }
};
```

2. **Usar nos Componentes**
```typescript
const { t } = useLanguage();
return <span>{t('new.key')}</span>;
```

### Diretrizes de Tradução
- Use chaves descritivas com notação de ponto
- Mantenha as traduções concisas, mas claras
- Considere o contexto cultural para as traduções em português
- Teste ambos os idiomas completamente

## Otimização de Desempenho

### Análise do Bundle
Para analisar o tamanho do bundle de produção, você pode usar uma ferramenta como `vite-bundle-visualizer`.
```bash
# Primeiro, gere o build de produção
npm run build

# Em seguida, analise os stats do build
# (Requer a instalação do pacote: npm install -g vite-bundle-visualizer)
vite-bundle-visualizer
```

### Melhores Práticas de Desempenho
- Use `React.memo` para componentes caros
- Implemente `key` props adequadas para listas
- Evite re-renderizações desnecessárias
- Use `useCallback` e `useMemo` apropriadamente
- Carregue componentes de forma tardia (lazy load) quando possível

### Exemplo de Divisão de Código
```typescript
// Carregar componentes de forma tardia
const LazyComponent = React.lazy(() => import('./LazyComponent'));

// Usar com Suspense
<Suspense fallback={<div>Carregando...</div>}>
  <LazyComponent />
</Suspense>
```

## Depuração

### Ferramentas de Desenvolvimento
- React Developer Tools
- Redux DevTools (se estiver usando Redux)
- Aba de Rede para depuração de API
- Console para rastreamento de erros

### Problemas Comuns e Soluções

#### Problemas de Conexão com a API
```typescript
// Verificar variáveis de ambiente
console.log('API URL:', import.meta.env.VITE_API_URL);

// Testar conectividade da API
fetch(import.meta.env.VITE_API_URL + '/health')
  .then(response => console.log('Status da API:', response.status))
  .catch(error => console.error('Erro na API:', error));
```

#### Problemas de CORS
- Garanta que o servidor da API tenha os cabeçalhos CORS adequados
- Verifique a aba de rede do navegador para erros de CORS
- Verifique se os endpoints da API estão acessíveis

#### Erros de TypeScript
- Verifique se há definições de tipo ausentes
- Garanta importações corretas
- Verifique se as definições de interface correspondem ao uso

## Implantação

### Processo de Build
```bash
# Criar build de produção
npm run build

# Visualizar build de produção localmente
npm run preview
```

### Variáveis de Ambiente
```bash
# Variáveis de ambiente de produção
VITE_OBSIDIAN_API_URL=https://sua-api-obsidian.com
VITE_EMBEDDINGS_API_URL=https://sua-api-embeddings.com
VITE_MCP_ENDPOINT=wss://seu-servidor-mcp.com/mcp
```

### Checklist de Implantação
- [ ] Todas as variáveis de ambiente configuradas
- [ ] Endpoints da API acessíveis a partir da produção
- [ ] CORS configurado para o domínio de produção
- [ ] Certificados SSL instalados
- [ ] Monitoramento de erros configurado
- [ ] Monitoramento de desempenho ativado

## Contribuição

### Diretrizes de Revisão de Código
- Garanta que o código siga os padrões estabelecidos
- Verifique a tipagem TypeScript adequada
- Verifique se o design responsivo funciona
- Teste os idiomas inglês e português
- Garanta que os padrões de acessibilidade sejam atendidos

### Template de Pull Request
```markdown
## Descrição
Breve descrição das alterações

## Tipo de Alteração
- [ ] Correção de bug
- [ ] Nova funcionalidade
- [ ] Alteração que quebra a compatibilidade
- [ ] Atualização da documentação

## Testes
- [ ] Testes unitários passam
- [ ] Testes de integração passam
- [ ] Teste manual concluído
- [ ] Ambos os idiomas testados

## Capturas de Tela
Inclua capturas de tela para alterações na UI
```

## Recursos

### Documentação
- [Documentação do React](https://pt-br.reactjs.org/docs/getting-started.html)
- [Manual do TypeScript](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)

### Tools
- [VS Code Extensions](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/)
- [Obsidian API Documentation](https://github.com/coddingtonbear/obsidian-local-rest-api)

### Community
- [React Community](https://reactjs.org/community/support.html)
- [TypeScript Community](https://www.typescriptlang.org/community/)
- [Obsidian Community](https://obsidian.md/community)