# Guia de Integração da API

## Visão Geral: A Arquitetura Centrada no Cognito

Este documento descreve as integrações de API para o Dashboard do CEO da GG.AI Labs. Nossa arquitetura foi projetada para simplicidade, segurança e poder, centralizando todas as operações baseadas em conhecimento através de um único gateway seguro: a **API do Cognito**.

O Dashboard do CEO **não** se comunica diretamente com nenhuma fonte de conhecimento (como o Obsidian) ou provedores de dados externos. Ele se comunica exclusivamente com seu próprio backend, que por sua vez orquestra chamadas para a API do Cognito e outros serviços. O Cognito atua como o **Guardião oficial do Segundo Cérebro**.

## 1. Integração Principal: API do Cognito

O Cognito é o motor de IA que se conecta e entende o Segundo Cérebro do usuário (Cofre do Obsidian). Ele fornece uma interface segura tanto para consultar conhecimento existente quanto para criar novo conhecimento.

### Propósito
- **Motor de Consulta**: Gerar resumos e insights temáticos de alto nível a partir da base de conhecimento.
- **Contextualizador**: Enriquecer dados de fontes externas com o conhecimento interno do usuário.
- **Criação de Conhecimento**: Permitir que o dashboard salve novas informações (como decisões e planos) de volta no Segundo Cérebro, fechando o ciclo de feedback.

### Configuração (Backend do Dashboard)

Crie um arquivo `.env` no diretório `/server`:
```bash
# server/.env
COGNITO_API_URL=http://127.0.0.1:8000
COGNITO_API_KEY=sua_chave_secreta_do_cognito
```

### Endpoints da API do Cognito

O Backend do Dashboard interage com estes endpoints centrais no Servidor do Cognito:

**A) Consulta por Insights**

Usado para fazer perguntas e gerar análises a partir do Segundo Cérebro.

```typescript
POST /api/query
Headers: {
  'Content-Type': 'application/json',
  'X-API-Key': 'sua_chave_secreta_do_cognito'
}
Body: {
  "prompt": "Seu prompt detalhado solicitando análise...",
  "session_id": "id-de-sessao-unico-para-esta-consulta"
}
```

**B) Criar uma Nova Nota**

Usado por funcionalidades como o `DecisionJournal` para salvar novo conhecimento de volta no Segundo Cérebro.

```typescript
POST /api/notes
Headers: {
  'Content-Type': 'application/json',
  'X-API-Key': 'sua_chave_secreta_do_cognito'
}
Body: {
  "path": "Caminho/Para/NovaNota.md", // Relativo à raiz do cofre
  "content": "---\nchave: valor\n---\n\n# Título da Nota\n\nConteúdo da nota..."
}
```

### Cliente de API do Frontend (`apiClient.ts` & `useAPI.ts`)

A interação do frontend com o backend é padronizada através de um hook e um cliente de API tipados, garantindo segurança e consistência.

- **`apiClient.ts`**: Uma classe singleton que centraliza todas as chamadas `fetch`. É responsável por:
  - Abstrair a complexidade das requisições HTTP.
  - Adicionar os headers corretos (ex: `Content-Type: application/json`).
  - Tratar as respostas, convertendo-as para JSON ou texto.
  - Lançar exceções padronizadas para erros de rede ou status HTTP diferente de `2xx`.

- **`useAPI.ts`**: O hook customizado que deve ser usado por todos os componentes que precisam interagir com a API. Ele expõe:
  - `apiClient`: A instância do cliente para fazer as chamadas.
  - `isConnected`: Um booleano que indica se o backend está acessível (verificado pela rota `/health`).
  - `error`: Uma mensagem de erro, caso a conexão falhe.

**Exemplo de Uso em um Componente React:**
```tsx
import { useAPI } from '../hooks/useAPI.ts';

const MyComponent = () => {
  const { apiClient, isConnected, error } = useAPI();

  const fetchData = async () => {
    if (!isConnected) return;
    try {
      const data = await apiClient.request('/api/some-data');
      console.log(data);
    } catch (err) {
      console.error('Falha ao buscar dados:', err);
    }
  };

  // ...
};
```

## 2. Integração Futura: Orquestração de Agentes (MCP)

Enquanto o Cognito é o agente especializado para o Segundo Cérebro, o **Protocolo de Contexto de Modelo (MCP)** é idealizado como o **Orquestrador** para gerenciar múltiplos e diversos agentes de IA no futuro.

### Visão

Uma requisição do usuário pode acionar o MCP para coordenar vários agentes:
- Um **Agente de Dados Externos** busca notícias de mercado.
- O **Cognito (como o "Agente do Eu")** contextualiza as notícias com base no conhecimento do usuário.
- Um **Agente de Escrita** elabora um relatório com base nos insights combinados.

Esta integração será construída sobre a base sólida fornecida pelo Cognito e é uma parte chave do roteiro de longo prazo do projeto.

## 3. Modelos de Dados

### Modelo de Insight de IA (do Cognito)
```typescript
interface AIInsight {
  id: string;
  title: string;
  content: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  source: 'cognito'; // A fonte é sempre Cognito
  actionable: boolean;
  timestamp: string;
  metadata: Record<string, any>;
}
```

### Modelo do Diário de Decisões (Enviado via API)
```typescript
interface NewDecisionData {
  title: string;
  description: string; // Mapeado do campo 'Context & Background' do formulário
  decision: string;
  rationale: string;
  expected_outcome?: string;
  confidence?: number; // 0-100
  impact?: 'high' | 'medium' | 'low';
  category?: 'strategic' | 'operational' | 'financial' | 'product' | 'people';
  tags?: string[];
  related_insights?: string[];
}
```

## Tratamento de Erros

### Tipos de Erro da API
```typescript
enum APIErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

interface APIError {
  type: APIErrorType;
  message: string;
  statusCode?: number;
  details?: any;
}
```

### Estratégia de Tratamento de Erros
```typescript
// src/utils/errorHandler.ts
class ErrorHandler {
  static handle(error: APIError) {
    switch (error.type) {
      case APIErrorType.NETWORK_ERROR:
        // Mostrar indicador de offline
        // Enfileirar requisições para nova tentativa
        break;
      case APIErrorType.AUTHENTICATION_ERROR:
        // Redirecionar para o login
        // Limpar tokens armazenados
        break;
      case APIErrorType.RATE_LIMIT_ERROR:
        // Implementar backoff exponencial
        // Mostrar aviso de limite de taxa
        break;
      default:
        // Registrar erro e mostrar mensagem genérica
        console.error('Erro na API:', error);
    }
  }
}
```

```typescript
// src/tests/integration/obsidianIntegration.test.ts
describe('Integração com Obsidian', () => {
  test('deve buscar e exibir notas recentes', async () => {
    // Simular resposta da API
    // Renderizar componente
    // Afirmar que a UI atualiza corretamente
  });

  test('deve lidar com erros da API de forma elegante', async () => {
    // Simular erro da API
    // Renderizar componente
    // Afirmar que o estado de erro é exibido
  });
});
```

## Otimização de Performance

### Estratégia de Cache
```typescript
// src/utils/cache.ts
class APICache {
  private cache = new Map();
  private ttl = 5 * 60 * 1000; // 5 minutos

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }
}
```

### Debouncing de Requisições
```typescript
// src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

## Considerações de Segurança

### Gerenciamento de Chaves de API
- Armazenar chaves de API em variáveis de ambiente
- Usar chaves diferentes para desenvolvimento e produção
- Implementar estratégia de rotação de chaves
- Monitorar o uso da chave de API

### Configuração do CORS
```typescript
// Headers CORS necessários para servidores de API
{
  'Access-Control-Allow-Origin': 'http://localhost:5173',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
}
```

### Limitação de Taxa (Rate Limiting)
- Implementar limitação de taxa no lado do cliente
- Usar backoff exponencial para novas tentativas
- Monitorar padrões de uso da API
- Configurar alertas para atividades incomuns