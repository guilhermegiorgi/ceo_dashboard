# GG.AI Labs - Dashboard do CEO

Um sofisticado dashboard executivo que se integra ao seu segundo cérebro do Obsidian para fornecer insights de negócios e recomendações estratégicas com tecnologia de IA.

## 🚀 Visão Geral

Este dashboard funciona como um centro de comando para CEOs e executivos, utilizando agentes de IA para analisar grafos de conhecimento, fornecer inteligência de negócios em tempo real e entregar insights acionáveis através de integrações avançadas com Obsidian, MCP (Protocolo de Contexto de Modelo) e serviços de IA customizados.

## ✨ Funcionalidades

### Dashboard Principal
- **Visão Geral de Métricas Executivas**: KPIs em tempo real, incluindo crescimento de receita, pontuações de eficiência de IA, projetos ativos e produtividade da equipe.
- **Insights com IA**: Recomendações estratégicas com pontuação de confiança e classificação de prioridade.
- **Suporte Bilíngue**: Alternância transparente PT-BR/Inglês com localização completa.
- **Design Responsivo**: UI premium com animações suaves e microinterações.

### Integrações
- **Grafo de Conhecimento do Obsidian**: Integração direta com seu segundo cérebro para análise de nós de conhecimento.
- **Serviços MCP**: Integração com o Protocolo de Contexto de Modelo para comunicação entre agentes de IA.
- **Gerenciamento de Projetos**: Acompanhamento de projetos em tempo real com visualização de progresso.
- **API de Embeddings de IA**: Integração com API customizada para análise de conteúdo e insights.

## 🛠 Tecnologias Utilizadas (Stack)

### Frontend
- **React 18** com TypeScript
- **Vite** para desenvolvimento e build
- **Tailwind CSS** para estilização
- **Lucide React** para ícones

### Backend (BFF)
- **Node.js** com **Express**
- **SQLite** para persistência de dados
- **Redis** para cache
- **Integração com APIs**: Obsidian, OpenAI, etc.
- **WebSocket** para comunicação em tempo real

## 🏗 Arquitetura

O projeto utiliza uma arquitetura **Backend for Frontend (BFF)**, separando claramente as responsabilidades:

```
/
├── src/       # Código-fonte do Frontend (React)
└── server/    # Código-fonte do Backend (Node.js/Express)
```

## 🚀 Como Começar

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Obsidian com acesso à API (para funcionalidade completa)

### Instalação

1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd gg-ai-labs-dashboard
```

2. Instale as dependências
```bash
npm install
```

3. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

4. Abra [http://localhost:5173](http://localhost:5173) no seu navegador

### Configuração de Ambiente

1. Copie o arquivo de exemplo para criar seu ambiente local:
   ```bash
   cp .env.example .env
   ```

2. Edite o arquivo `.env` com suas chaves e configurações. As variáveis são separadas por responsabilidade:
   - **Variáveis `VITE_`**: São seguras para serem expostas ao frontend.
   - **Outras Variáveis**: São secretas e usadas apenas pelo servidor backend.

   ```env
   # Frontend Environment Variables
   VITE_API_BASE_URL=http://localhost:3001
   VITE_WEBSOCKET_URL=ws://localhost:3001

   # Backend Environment Variables (Secrets)
   PORT=3001
   OBSIDIAN_API_KEY=your_obsidian_api_key
   OPENAI_API_KEY=your_openai_api_key
   # ... e outras chaves secretas
   ```

## 🔧 Configuração

### Configuração do Obsidian
1. Instale o plugin Obsidian Local REST API
2. Configure o acesso à API nas configurações do Obsidian
3. Atualize as variáveis de ambiente com os detalhes da sua API do Obsidian

### Configuração dos Serviços de IA
1. Faça o deploy da sua API de embeddings/transformers
2. Configure os endpoints da API nas variáveis de ambiente
3. Configure as chaves de autenticação

## 📊 Funcionalidades em Detalhe

### Motor de Insights de IA
- **Pontuação de Confiança**: Cada insight inclui um percentual de confiança.
- **Classificação de Prioridade**: Sistema de prioridade Alta/Média/Baixa.
- **Recomendações Acionáveis**: Próximos passos claros para cada insight.
- **Análise em Tempo Real**: Processamento ao vivo do seu grafo de conhecimento.

### Integração com Grafo de Conhecimento
- **Funcionalidade de Busca**: Consulte seu cofre do Obsidian diretamente.
- **Visualização de Nós**: Veja conexões e relacionamentos.
- **Atividade Recente**: Acompanhe as últimas atualizações de conhecimento.
- **Insights Gerados por IA**: Análise automática de suas notas.

### Gerenciamento de Projetos
- **Acompanhamento de Progresso**: Barras de progresso visuais e indicadores de status.
- **Gerenciamento de Equipe**: Alocação de membros e distribuição de carga de trabalho.
- **Monitoramento de Orçamento**: Acompanhamento financeiro e cálculos de ROI.
- **Gerenciamento de Prazos**: Visualização de cronogramas e alertas.

## 🌐 Internacionalização

O dashboard suporta tanto Inglês quanto Português (Brasil) com:
- Tradução completa da UI
- Formatação de números localizada
- Conversão de moeda (USD ↔ BRL)
- Localização de data/hora
- Adaptações culturais

## 🎨 Sistema de Design

### Paleta de Cores
- **Primária**: Gradientes de Azul para Roxo
- **Secundária**: Gradientes de Verde para Ciano
- **Destaque**: Gradientes de Roxo para Rosa
- **Cores de Status**: Verde (sucesso), Amarelo (aviso), Vermelho (erro)
- **Fundo**: Slate 900/800 com camadas de transparência

### Tipografia
- **Títulos**: Negrito, hierarquia clara
- **Corpo de Texto**: Legível com contraste adequado
- **Métricas**: Números grandes e proeminentes
- **Rótulos**: Sutis, informativos

## 🔮 Roadmap

### Fase 1 (Atual)
- [x] UI principal do dashboard
- [x] Suporte bilíngue
- [x] Integração de dados mock
- [x] Design responsivo

### Fase 2 (Próxima)
- [ ] Integração com API do Obsidian
- [ ] Conexões de dados em tempo real
- [ ] Implementação de WebSocket
- [ ] Autenticação de usuário

### Fase 3 (Futura)
- [ ] Integração com protocolo MCP
- [ ] Agentes de IA avançados
- [ ] Processamento de embeddings customizados
- [ ] Suporte a múltiplos usuários
- [ ] Aplicativo móvel complementar

## 🤝 Contribuição

1. Faça um fork do repositório
2. Crie uma branch de funcionalidade (`git checkout -b feature/funcionalidade-incrivel`)
3. Faça commit de suas alterações (`git commit -m 'Adiciona funcionalidade incrível'`)
4. Envie para a branch (`git push origin feature/funcionalidade-incrivel`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para suporte e perguntas:
- Crie uma issue no repositório
- Contate a equipe de desenvolvimento
- Verifique a [documentação](DOCS.md) para guias detalhados

## 🙏 Agradecimentos

- Equipe do Obsidian pela plataforma de gerenciamento de conhecimento
- Comunidades React e Vite
- Tailwind CSS pelo sistema de design
- Lucide pelos ícones incríveis