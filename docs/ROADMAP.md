# Roadmap do Produto

## Visão

Evoluir o Dashboard do CEO para um verdadeiro parceiro de Inteligência Aumentada. Ao "fechar o ciclo" entre os insights gerados por IA e as decisões registradas pelo usuário, o sistema criará um ciclo virtuoso de aprendizado e refinamento estratégico, com a **API do Cognito** servindo como o sistema nervoso central para todas as operações baseadas em conhecimento.

## Status Atual

### ✅ Funcionalidades Concluídas
- **UI Principal do Dashboard**: Interface de nível executivo com design premium.
- **Suporte Bilíngue**: Localização completa em EN/PT-BR.
- **Integração de Insights do Cognito**: O dashboard está conectado à API do Cognito, exibindo resumos temáticos em tempo real do Segundo Cérebro.

---

## 🎯 Ciclo de Desenvolvimento Atual: Do Insight à Decisão Registrada

Este ciclo está focado em implementar a funcionalidade mais transformadora: a capacidade do sistema de aprender com as ações do usuário. Construiremos as ferramentas necessárias não apenas para consumir insights, mas para agir sobre eles e registrar essas ações, enriquecendo assim o Segundo Cérebro.

### 📋 Funcionalidades Principais

#### 1. Diário de Decisões (`DecisionJournal.tsx`)
- **Prioridade**: Máxima
- **Objetivo**: Implementar a UI completa e o fluxo de backend para capturar decisões estratégicas.
- **História de Usuário**: Como usuário, quero documentar uma decisão chave, seu contexto e meu raciocínio, para que essa decisão se torne uma parte permanente e consultável do meu Segundo Cérebro.
- **Tarefas**:
  - [ ] Finalizar a UI do componente `DecisionJournal`.
  - [ ] Criar um endpoint `POST /api/decisions` no backend do dashboard.
  - [ ] Implementar a lógica de serviço para formatar os dados da decisão em uma nota Markdown.
  - [ ] Implementar a chamada de servidor para servidor para o endpoint `POST /api/notes` do Cognito para salvar a nota.

#### 2. Planejador Estratégico (`StrategicSessionPlanner.tsx`)
- **Prioridade**: Alta
- **Objetivo**: Criar uma ponte entre insights e ações do mundo real.
- **História de Usuário**: Como usuário, quando um insight apresenta uma oportunidade, quero agendar imediatamente uma sessão estratégica para discuti-la, criando uma nota de placeholder no meu Segundo Cérebro para a pauta da reunião.
- **Tarefas**:
  - [ ] Projetar a UI para o componente `StrategicSessionPlanner`.
  - [ ] Criar um endpoint `POST /api/strategic-sessions`.
  - [ ] Implementar a lógica para criar um modelo de pauta de reunião e salvá-lo através da API do Cognito.

---

## 🔮 Fases Futuras de Desenvolvimento

As fases a seguir se baseiam no ciclo de feedback principal estabelecido no ciclo atual.

### Fase 2: Inteligência e Automação

- **Objetivo**: Aprimorar o dashboard com inteligência proativa e ciente do contexto.
- **Funcionalidades Chave**:
  - **Motor de Inteligência de Mercado**: Integrar APIs de dados externos e usar o Cognito para fornecer análises contextuais (ex: "Como esta notícia de mercado afeta meus projetos?").
  - **Busca Avançada**: Implementar capacidades de busca mais sofisticadas dentro do dashboard, com tecnologia do Cognito.
  - **Etiquetagem Automatizada**: Usar o Cognito para sugerir etiquetas e links para novas decisões e notas, melhorando a organização do conhecimento.

### Fase 3: Orquestração Multi-Agente

- **Objetivo**: Escalar as capacidades do sistema introduzindo uma arquitetura multi-agente.
- **Funcionalidades Chave**:
  - **Integração MCP**: Implementar o Protocolo de Contexto de Modelo (MCP) como um orquestrador.
  - **Agentes Especializados**: Desenvolver ou integrar agentes para tarefas específicas (ex: pesquisa, escrita, análise de dados).
  - **Fluxos de Trabalho Complexos**: Permitir que o dashboard execute tarefas de múltiplos passos coordenando diferentes agentes, com o Cognito sempre atuando como o "Agente do Eu" principal para o contexto pessoal.

### Fase 4: Empresa e Colaboração

- **Objetivo**: Expandir a plataforma para uso em equipe e integração empresarial.
- **Funcionalidades Chave**:
  - **Autenticação de Usuário**: Implementar login de usuário robusto e acesso baseado em funções.
  - **Ferramentas de Colaboração**: Permitir insights compartilhados e diários de decisão em equipe.
  - **API Empresarial**: Fornecer uma API pública para integração com outros sistemas de negócios.