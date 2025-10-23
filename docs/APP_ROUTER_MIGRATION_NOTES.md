# App Router Migration Status

_Atualizado em: 2025-10-17_

## Infraestrutura configurada
- Next.js 14 com App Router habilitado (`next.config.mjs`, `next-env.d.ts`, `tsconfig.json`).
- Provedores globais migrados para `app/providers.tsx`, mantendo `APIProvider`, `SettingsModalProvider` e `LanguageProvider`.
- TailwindCSS apontando para os novos diretórios (`app/**/*` e `src/**/*`).
- Comandos npm atualizados (`next dev`, `next build`, `next start`) preservando o backend Express.

## Rotas migradas para App Router
- `/` – `BusinessIntelligenceHub`.
- `/login` – fluxo de autenticação com email/senha e Google OAuth.
- `/auth/callback` – persistência de tokens OAuth e carregamento do usuário.
- `/projects`, `/knowledge-graph`, `/decision-journal`, `/session-planner`, `/agents`.
- `/chat-preview` – protótipo com assistant-ui para avaliação da nova experiência de chat.

## Componentes atualizados
- Remoção de dependências do `react-router-dom` em `BusinessIntelligenceHub`, `NavigationSidebar`, `DashboardLayout`, `Header`, `ConversationHistory` e `useChat`.
- `apiClient` usa `resolveApiBaseUrl` com suporte a variáveis `NEXT_PUBLIC_*`.
- `globals.css` movido para `app/globals.css`.

## Pendências principais
1. Validar e refinar rotas de chat já migradas (`app/(dashboard)/chat`, `app/(dashboard)/chat-centered`) incluindo componentes auxiliares (`CognitoChat.tsx`).
2. Revisar componentes com lint pendente (ex.: `AIAgentOrchestrator`, `AgentManager`, `CognitoChat`) e ajustar tipos `any` e hooks.
3. Avaliar remoção/arquivamento das antigas rotas Vite (`src/App.tsx`, `src/main.tsx`, `src/pages/*` redundantes) após a migração completa.
4. Atualizar scripts de build/deploy para usar `next build` + `next start` (pipelines, Docker, etc.).
5. Integrar middlewares de autenticação (cookies/JWT) caso necessário no lado servidor.

## Próximos passos sugeridos
1. Criar rota `app/(dashboard)/chat/page.tsx` e adaptar o hook `useChat` para funcionar com streaming e tool-calls no App Router.
2. Implementar middleware de proteção (`middleware.ts`) para redirecionar automaticamente usuários não autenticados.
3. Rodar suíte de testes frontend/backend e ajustar configurações do CI.
4. Atualizar documentação operacional (README) descrevendo a nova estrutura.
