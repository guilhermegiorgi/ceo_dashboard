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

   O projeto utiliza arquivos `.env` para centralizar credenciais do backend e variáveis expostas ao Next.js. Para começar, duplique os arquivos de exemplo:

   ```bash
   cp .env.example .env          # Variáveis globais (Next.js + serviços compartilhados)
   cp server/.env.example server/.env  # Caso deseje isolar configs do backend
   ```

   Ajuste os valores conforme a sua stack. Os nomes de variáveis seguem o padrão atual de cada camada:

   ```env
   # Next.js (variáveis expostas ao cliente)
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3002
   NEXT_PUBLIC_APP_VERSION=1.0.0

   # Backend Node/Express
   PORT=3001
   NODE_ENV=development
   DATABASE_URL=postgres://...
   REDIS_URL=redis://localhost:6379
   JWT_SECRET=change-me
   SESSION_SECRET=change-me

   # Integrações externas (mantidas com prefixo VITE_ por compatibilidade)
   VITE_BRAINCLOUD_BASE_URL=https://obsidian-mcp.ggailabs.com
   VITE_BRAINCLOUD_API_TOKEN=ggai_...
   VITE_BRAINCLOUD_MCP_HTTP=https://obsidian-mcp.ggailabs.com/api/v1/mcp/http/
   VITE_WEBSOCKET_URL=ws://localhost:3001
   EMBEDDINGS_API_URL=http://localhost:8000
   EMBEDDINGS_API_KEY=your_embeddings_api_key
   OPENAI_API_KEY=your_openai_api_key
   ```

3. **Iniciar Servidores de Desenvolvimento**

   O projeto é configurado para iniciar tanto o backend quanto o frontend simultaneamente com um único comando. A partir do diretório raiz, execute:

   ```bash
   npm run dev
   ```

   Este comando utiliza `concurrently` para:
   - Reiniciar o backend Express via `nodemon` em `http://localhost:3001`.
   - Rodar o Next.js em modo desenvolvimento na porta `3000`.

4. **Abrir Navegador**
   Após a execução do comando, navegue para `http://localhost:3000`.

## Estrutura do Projeto

A arquitetura combina um frontend em **Next.js (App Router)** com um backend em **Node.js/Express**. O repositório mantém pastas legadas (`src/pages`) para referência, mas o fluxo oficial roda no diretório `app/`.

```
/ (Raiz do Projeto)
├── app/                     # Rotas e layouts do Next.js App Router
├── src/                     # Componentes compartilhados, hooks e serviços
├── server/                  # Código-fonte do backend Express
├── docs/                    # Documentação do projeto
├── next.config.mjs          # Configuração do Next.js
├── package.json             # Dependências e scripts do projeto
└── tsconfig.json            # Configuração TypeScript raiz
```

### Estrutura do Frontend (Next.js)

```
app/
├── (dashboard)/             # Rotas autenticadas (Dashboard, projetos, chat)
├── (auth)/                  # Fluxo de login, logout e callback OAuth
├── api/                     # Endpoints server actions/route handlers
├── globals.css              # Estilos globais
└── providers.tsx            # Providers compartilhados (tema, query, etc.)

src/
├── components/              # Componentes React reutilizáveis
├── services/                # Cliente de API e integrações
├── hooks/                   # Hooks customizados (ex: useAPI, useUIState)
├── contexts/                # Contextos (ex: DashboardDataProvider)
└── lib/                     # Utilitários e helpers
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
    this.baseUrl =
      process.env.NEXT_PUBLIC_NEW_SERVICE_URL ??
      process.env.NEW_SERVICE_URL ??
      "";
    this.apiKey =
      process.env.NEXT_PUBLIC_NEW_SERVICE_KEY ?? process.env.NEW_SERVICE_KEY ?? "";
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
Para investigar o tamanho do bundle produzido pelo Next.js, utilize o script dedicado:
```bash
# Gera relatórios de bundle usando a automação interna
npm run analyze:bundle
```
O comando acima executa `next build` com a configuração de análise embutida em `scripts/analyze-bundle.js`, gerando arquivos em `.next/analyze`.

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
console.log('API URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

// Testar conectividade da API
fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3002'}/health`)
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

# Servir o build de produção localmente (Next.js)
npm run start
```

### Variáveis de Ambiente
```bash
# Variáveis de ambiente de produção
NEXT_PUBLIC_API_BASE_URL=https://api.seu-dominio.com
NEXT_PUBLIC_APP_VERSION=1.0.0

# Variáveis legadas (prefixo VITE_) ainda consumidas por serviços MCP
VITE_BRAINCLOUD_BASE_URL=https://obsidian-mcp.ggailabs.com
VITE_BRAINCLOUD_API_TOKEN=ggai_prod_token
VITE_BRAINCLOUD_MCP_HTTP=https://obsidian-mcp.ggailabs.com/api/v1/mcp/http/
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
- [Next.js Documentation](https://nextjs.org/docs)

### Tools
- [VS Code Extensions](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/)
- [Obsidian API Documentation](https://github.com/coddingtonbear/obsidian-local-rest-api)

### Community
- [React Community](https://reactjs.org/community/support.html)
- [TypeScript Community](https://www.typescriptlang.org/community/)
- [Obsidian Community](https://obsidian.md/community)
