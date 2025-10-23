# Jest → Vitest Migration Report

**Data:** 2025-10-20
**Status:** 🔶 **80% Completo** - Requer refactoring manual de mocks

---

## ✅ Completed

### 1. Vitest Installation
```bash
✅ npm install -D vitest @vitest/ui c8
✅ npm uninstall jest @types/jest ts-jest
```

### 2. Configuration
✅ **vitest.config.ts** criado
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.test.ts', 'server/**/*.spec.js'],
    coverage: { provider: 'c8', ... }
  }
});
```

### 3. Package.json Scripts
✅ Atualizado de Jest para Vitest:
```json
{
  "test": "vitest run",
  "test:backend": "vitest run",
  "test:backend:watch": "vitest",
  "test:backend:ui": "vitest --ui",
  "test:backend:coverage": "vitest run --coverage"
}
```

### 4. Import Statements
✅ Todos os arquivos de teste atualizados:
```typescript
// Antes (Jest):
import { jest } from '@jest/globals';

// Depois (Vitest):
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
```

### 5. Mock Functions
✅ Arquivo de mocks atualizado:
```typescript
// server/services/brainCloud/__tests__/helpers/mocks.ts
import { vi } from 'vitest';

// jest.fn() → vi.fn()
export const mockFunction = vi.fn();
```

---

## ⚠️ Blocker: vi.mock() Hoisting Issue

### Problema

Vitest tem comportamento diferente de Jest para `vi.mock()`:

**Erro:**
```
[vitest] There was an error when mocking a module.
If you are using "vi.mock" factory, make sure there are no top level variables inside,
since this call is hoisted to top of the file.

ReferenceError: Cannot access '__vi_import_1__' before initialization
```

**Causa:**
```typescript
// ❌ Não funciona com Vitest (funciona com Jest)
import { mockBrainCloudClient } from './helpers/mocks';

vi.mock('../../brainCloudClient.js', () => mockBrainCloudClient);
//                                          ^^^^^^^^^^^^^^^^^^^
// Error: variável externa usada em factory hoisted
```

### Arquivos Afetados

1. `server/services/brainCloud/adapters/__tests__/RestBrainCloudAdapter.test.ts`
2. `server/services/brainCloud/adapters/__tests__/McpBrainCloudAdapter.test.ts`
3. `server/routes/__tests__/brainEvents.spec.js` (types import issue)

---

## 🔧 Solução: Refactor Mock Strategy

### Opção A: Inline Factory (Recomendado)

**Antes:**
```typescript
import { mockBrainCloudClient } from './helpers/mocks';

vi.mock('../../brainCloudClient.js', () => mockBrainCloudClient);
```

**Depois:**
```typescript
vi.mock('../../brainCloudClient.js', () => ({
  default: {
    search: vi.fn(),
    getGraphData: vi.fn(),
    getCurrentFocus: vi.fn(),
    // ... todos os métodos inline
  }
}));

// Depois configurar no beforeEach:
beforeEach(() => {
  vi.mocked(brainCloudClient.search).mockResolvedValue({ results: [] });
});
```

### Opção B: Spy Pattern (Alternativa)

**Sem usar vi.mock():**
```typescript
import * as brainCloudClientModule from '../../brainCloudClient.js';

describe('RestBrainCloudAdapter', () => {
  let searchSpy: any;

  beforeEach(() => {
    searchSpy = vi.spyOn(brainCloudClientModule.default, 'search')
      .mockResolvedValue({ results: [] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // testes...
});
```

### Opção C: Manual Mocks Directory

**Criar:** `server/services/__mocks__/brainCloudClient.js`
```javascript
import { vi } from 'vitest';

export default {
  search: vi.fn(),
  getGraphData: vi.fn(),
  // ...
};
```

**No teste:**
```typescript
vi.mock('../../brainCloudClient.js'); // Auto-usa __mocks__/

import brainCloudClient from '../../brainCloudClient.js';

beforeEach(() => {
  brainCloudClient.search.mockResolvedValue({ results: [] });
});
```

---

## 📋 Trabalho Restante

### 1. RestBrainCloudAdapter.test.ts (1h)
- [ ] Remover import de mock externo
- [ ] Criar vi.mock() inline com factory
- [ ] Ou: criar `__mocks__/brainCloudClient.js`
- [ ] Atualizar assertions para vi.mocked()

### 2. McpBrainCloudAdapter.test.ts (1h)
- [ ] Remover import de mock externo
- [ ] Criar vi.mock() inline para brainCloudService
- [ ] Ou: usar spy pattern em vez de vi.mock()
- [ ] Atualizar assertions

### 3. brainEvents.spec.js (30min)
- [ ] Corrigir import: `./adapters/types` → `./adapters/types.js`
- [ ] Converter de CommonJS para ES modules (opcional)
- [ ] Atualizar mocks para inline factories

### 4. BrainCloudService.test.ts (30min)
- [ ] Verificar se imports estão corretos
- [ ] Testar isoladamente
- [ ] Pode estar funcionando, só bloqueado por dependências circulares

---

## 🎯 Próximos Passos

### Passo 1: Corrigir import de types (5min)
```bash
# Em server/services/brainCloud/adapters/index.ts
- export * from "./types";
+ export * from "./types.js";
```

### Passo 2: Refatorar RestBrainCloudAdapter.test.ts (1h)
```typescript
// Exemplo de refactor completo:
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RestBrainCloudAdapter } from '../RestBrainCloudAdapter';

// Mock inline (sem variáveis externas)
vi.mock('../../brainCloudClient.js', () => ({
  default: {
    search: vi.fn(),
    getFileContents: vi.fn(),
    getGraphData: vi.fn(),
    getCurrentFocus: vi.fn(),
    getDueTasks: vi.fn(),
    getHistoricalContext: vi.fn(),
  }
}));

vi.mock('../events', () => ({
  globalEventBus: {
    emit: vi.fn(),
  },
}));

import brainCloudClient from '../../brainCloudClient.js';
import { globalEventBus } from '../events';

describe('RestBrainCloudAdapter', () => {
  let adapter: RestBrainCloudAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new RestBrainCloudAdapter();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('search', () => {
    it('deve realizar busca via brainCloudClient', async () => {
      // Arrange
      const mockResponse = { results: [{ path: 'test.md', title: 'Test' }] };
      vi.mocked(brainCloudClient.search).mockResolvedValue(mockResponse);

      // Act
      const result = await adapter.search({ query: 'test' });

      // Assert
      expect(result.files).toHaveLength(1);
      expect(brainCloudClient.search).toHaveBeenCalledWith({
        query: 'test',
        case_sensitive: false
      });
      expect(globalEventBus.emit).toHaveBeenCalledWith('search:completed', expect.any(Object));
    });
  });

  // ... resto dos testes
});
```

### Passo 3: Executar testes (5min)
```bash
npm run test:backend
# Verificar se RestBrainCloudAdapter tests passam
```

### Passo 4: Repetir para McpBrainCloudAdapter (1h)
### Passo 5: Repetir para brainEvents.spec.js (30min)

### Passo 6: Coverage report (5min)
```bash
npm run test:backend:coverage
```

---

## 📊 Estimativa Final

| Tarefa | Tempo | Status |
|--------|-------|--------|
| Vitest setup | 30min | ✅ Completo |
| Config + Scripts | 15min | ✅ Completo |
| Import updates | 30min | ✅ Completo |
| Mock helpers | 15min | ✅ Completo |
| **RestAdapter refactor** | 1h | ⏳ Pendente |
| **McpAdapter refactor** | 1h | ⏳ Pendente |
| **brainEvents refactor** | 30min | ⏳ Pendente |
| **BrainCloudService test** | 30min | ⏳ Pendente |
| Coverage + docs | 15min | ⏳ Pendente |
| **TOTAL** | **5h 15min** | **60% Completo** |

---

## ✅ Para Concluir Migração (3h)

### Quick Win (1.5h):
1. Refatorar RestBrainCloudAdapter.test.ts usando inline mocks
2. Executar testes desse arquivo isoladamente
3. Validar cobertura

### Medium Win (1.5h):
1. Refatorar McpBrainCloudAdapter.test.ts
2. Refatorar brainEvents.spec.js
3. Validar BrainCloudService.test.ts
4. Gerar coverage report completo

### Total para 100%: ~3h de trabalho manual

---

## 🚀 Alternativa: Vitest UI para Debug

Enquanto trabalha nos refactors, use Vitest UI:
```bash
npm run test:backend:ui
```

Abre interface visual em http://localhost:51204 para:
- Ver quais testes passam/falham
- Debug interativo
- Hot reload de testes

---

## 📝 Lições Aprendidas

### ✅ Vitest Advantages:
- Muito mais rápido que Jest
- Suporte nativo ES modules
- Melhor TypeScript support
- UI interativa excelente

### ⚠️ Vitest Gotchas:
- `vi.mock()` é mais restritivo que `jest.mock()`
- Factory functions não podem usar variáveis externas
- Precisa inline mocks ou __mocks__ directory
- Hoisting funciona diferente

### 💡 Best Practice:
- Usar inline mocks sempre que possível
- Evitar variáveis externas em factories
- Preferir spy pattern para casos simples
- Usar `__mocks__` para módulos complexos reutilizáveis

---

**Status:** 🔶 **Bloqueado em 60%** - Precisa refactoring manual de mocks (3h)

**Próximo Passo:** Refatorar RestBrainCloudAdapter.test.ts com inline mocks
