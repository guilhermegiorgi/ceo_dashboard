# Guia de Testes E2E (Playwright)

## Visão Geral
- Tecnologia: [Playwright](https://playwright.dev/) + TypeScript.
- Localização do setup: `tests/e2e/`.
- Objetivo Sprint 2/3: cobrir fluxos críticos (auth, chat/MCP, CRUD) em cima do App Router.

## Estrutura de Pastas
```
tests/e2e/
├── setup/
│   ├── auth.setup.ts       # helpers de autenticação (loginViaUI / storage state)
│   └── test-data.ts        # credenciais padrão, rotas e seletores compartilhados
├── fixtures.ts             # extensão do Playwright test + fixtures reusáveis
├── critical/
│   ├── auth-flow.spec.ts   # teste completo de login (implementado)
│   ├── chat-mcp.spec.ts    # placeholder (skip) para validação MCP
│   └── dashboard.spec.ts   # placeholder (skip) para smoke do hub
├── features/
│   ├── projects.spec.ts    # placeholder (skip) para CRUD de projetos
│   └── knowledge-graph.spec.ts # placeholder (skip) p/ navegação no grafo
└── playwright.config.ts    # configurações globais (baseURL, reporter, devices)
```

## Como Rodar Localmente
1. Certifique-se de que o frontend (`npm run dev:frontend`) e backend (`npm run dev:backend`) estão rodando nas portas padrão (3000/3001).
2. Instale os browsers do Playwright apenas na primeira vez:
   ```bash
   npx playwright install
   ```
3. Execute os testes:
   ```bash
   npm run test:e2e
   ```
4. Variáveis úteis:
   - `PLAYWRIGHT_BASE_URL`: sobrescreve o host padrão (`http://localhost:3000`).
   - `E2E_USER_EMAIL` / `E2E_USER_PASSWORD`: usuário usado pelo helper `loginViaUI` (defaults para `dev@ggai.dev` / `Dev@2025!`).

## Criando Novos Testes
1. **Escolha o diretório**:
   - `tests/e2e/critical`: fluxos fim-a-fim que bloqueiam release (login, dashboard, MCP).
   - `tests/e2e/features`: cenários funcionais específicos (CRUD, navegação, integrações).
2. **Use a fixture `test`** de `tests/e2e/fixtures.ts`:
   ```ts
   import { test, expect } from '../fixtures';

   test('exemplo', async ({ page, login }) => {
     await login();
     // ... validações
   });
   ```
3. **Reaproveite helpers**:
   - `loginViaUI(page)` para autenticar.
   - `ensureStorageState(page, path)` para gerar `storageState` quando necessário.
   - Seletores compartilhados em `setup/test-data.ts`.
4. **Padrões**:
   - Nome de arquivo em `kebab-case`.
   - `test.describe('<área> • <contexto>')` para agrupar cenários.
   - `test.skip/test.fixme` para placeholders com justificativa clara.
   - Prefira `getByRole/getByLabel/getByPlaceholder` a seletores CSS frágil.

## Convenções de Código & Boas Práticas
- **Login**: sempre reutilizar fixture/helper; evita duplicar credenciais.
- **Sincronização**: esperar por URLs (`page.waitForURL`) e elementos estáveis antes de assertar.
- **Dados**: quando precisar criar entidades, considere usar APIs do backend diretamente (via `request` fixture) para evitar dependência em UI.
- **Artefatos**: traces/screenshot/video ficam em `tests/e2e/.artifacts`. Ao depurar falhas, executar com `npx playwright show-trace`.

## Plano de Integração CI/CD
1. **Pipeline**: adicionar etapa `npm run test:e2e` depois do build (`next build`) no fluxo de CI.
2. **Ambiente**: subir containers Next.js/Express com seed de dados (`npm run db:setup` + `npm run test:user`) antes dos testes.
3. **Storage state opcional**: usar `ensureStorageState` em `globalSetup` futuro para acelerar testes (armazenar em `.auth/state.json`).
4. **Relatórios**: pipeline deve publicar `tests/e2e/.reports` (HTML) como artefato para análise pós-execução.
5. **Gate**: marcar pipeline como bloqueante em deploy para produção quando specs em `critical/` falharem.

---

Para dúvidas adicionais consulte o time de QA/Infra e alinhe com o roadmap de Sprints 2 e 3.
