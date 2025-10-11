# Arquitetura de Agentes de Inteligência

Este documento descreve a arquitetura e o plano de implementação para o sistema de Agentes de Inteligência, transformando o CEO Dashboard em uma plataforma de Inteligência Híbrida (Interna + Externa).

## Conceito Central

O sistema será baseado em "Agentes de IA" configuráveis e gerenciáveis. Cada agente terá uma missão específica (ex: extrair palavras-chave do vault, buscar notícias de mercado, analisar dados de concorrentes). A configuração e os dados coletados por esses agentes serão armazenados em um banco de dados central, permitindo um ecossistema de inteligência modular e escalável.

---

## Plano de Implementação em Fases

### Fase 0: Fundação - O Painel de Controle dos Agentes

**Objetivo:** Construir a infraestrutura básica para criar, configurar e gerenciar agentes. Sem isso, nenhuma automação é possível.

**O que será feito:**
1.  **Schema do Banco de Dados:** Estender o banco de dados (`dashboard.db`) com novas tabelas:
    *   `agents`: Para armazenar a configuração de cada agente (nome, tipo, provedor de IA, modelo, agendamento, status).
    *   `agent_runs`: Um log para cada execução de um agente (início, fim, status, log de saída).
    *   `monitored_keywords`: Para armazenar os termos e entidades extraídos do vault, que servirão de alvo para os agentes externos.
    *   `collected_data`: Para armazenar as informações brutas coletadas pelos agentes externos (ex: artigos, notícias).
2.  **API Backend:** Criar endpoints CRUD na API Node.js (`/api/agents`) para gerenciar os agentes a partir da interface.
3.  **UI Frontend:** Desenvolver uma nova página no Dashboard para:
    *   Listar os agentes existentes.
    *   Criar novos agentes através de um formulário (definindo nome, tipo, agendamento, etc.).
    *   Visualizar o status e o histórico de execuções de cada agente.

**Componentes impactados:** `server/services/database.js`, `server/scripts/setup.js`, novas rotas e serviços no backend, nova página e componentes no frontend.

---

### Fase 1: O Primeiro Agente - "Minerador de Conhecimento"

**Objetivo:** Criar o primeiro agente, cuja função é analisar o vault do Obsidian e popular a tabela `monitored_keywords`.

**O que será feito:**
1.  **Lógica do Agente:** Implementar a lógica que:
    *   Escaneia diretórios específicos do vault (ex: `PROJETOS/ATIVOS`, `BASE-DE-CONHECIMENTO`).
    *   Usa processamento de linguagem natural (NLP) simples ou uma chamada de IA para extrair palavras-chave, tags e entidades relevantes de cada nota.
    *   Salva esses termos na tabela `monitored_keywords` do banco de dados.
2.  **Integração:** Registrar este novo tipo de agente no Painel de Controle da Fase 0.

**Componentes impactados:** Novo arquivo de lógica para o agente, `vaultService.js`.

---

### Fase 2: O Segundo Agente - "Vigia de Mercado"

**Objetivo:** Criar um agente que usa os termos da Fase 1 para buscar informações externas.

**O que será feito:**
1.  **Lógica do Agente:** Implementar a lógica que:
    *   Lê os termos da tabela `monitored_keywords`.
    *   Usa uma API de busca web (ex: Google Search API) para encontrar artigos e notícias relevantes para esses termos.
    *   Salva os resultados (URL, título, resumo) na tabela `collected_data`.
2.  **Gerenciamento de API:** Adicionar no formulário de agentes um campo para inserir a chave de API do serviço de busca.

**Componentes impactados:** Novo arquivo de lógica para o agente, integração com API externa.

---

### Fase 3: O Terceiro Agente - "Analisador de Relevância"

**Objetivo:** Conectar os dados externos com o conhecimento interno, filtrando o ruído.

**O que será feito:**
1.  **Lógica do Agente:** Implementar a lógica que:
    *   Processa os itens da tabela `collected_data` que ainda não foram analisados.
    *   Gera um embedding para cada artigo/notícia.
    *   Compara esse embedding com os embeddings das notas internas relacionadas ao mesmo `monitored_keyword`.
    *   Calcula uma pontuação de relevância e a salva junto ao dado coletado.

**Componentes impactados:** Novo arquivo de lógica para o agente, `cognitoService.js` (para embeddings).

---

### Fase 4: Integração e Geração de Insights Híbridos

**Objetivo:** Usar os dados externos e relevantes para gerar insights mais poderosos.

**O que será feito:**
1.  **Novo "Esquadrão de Insights":** Criar uma nova estratégia no `insightService` que utiliza os dados de alta relevância da tabela `collected_data` como contexto.
2.  **UI de Inteligência de Mercado:** Desenvolver a interface para visualizar os dados coletados, permitindo ao usuário ver as notícias e artigos que o sistema está monitorando.
3.  **Automação:** Implementar a lógica de agendamento (cron jobs) para executar os agentes automaticamente, conforme configurado no Painel de Controle.

**Componentes impactados:** `insightService.js`, novos componentes de UI no frontend.
