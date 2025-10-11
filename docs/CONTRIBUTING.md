# Contribuindo para o Dashboard de CEO da GG.AI Labs

Obrigado pelo seu interesse em contribuir para o Dashboard de CEO da GG.AI Labs! Este documento fornece diretrizes e informações para contribuidores.

## Índice

- [Código de Conduta](#código-de-conduta)
- [Como Começar](#como-começar)
- [Processo de Desenvolvimento](#processo-de-desenvolvimento)
- [Diretrizes de Contribuição](#diretrizes-de-contribuição)
- [Processo de Pull Request](#processo-de-pull-request)
- [Relatório de Issues](#relatório-de-issues)
- [Padrões de Codificação](#padrões-de-codificação)
- [Diretrizes de Teste](#diretrizes-de-teste)
- [Documentação](#documentação)

## Código de Conduta

### Nosso Compromisso

Estamos comprometidos em tornar a participação neste projeto uma experiência livre de assédio para todos, independentemente de idade, tamanho do corpo, deficiência, etnia, identidade e expressão de gênero, nível de experiência, nacionalidade, aparência pessoal, raça, religião ou identidade e orientação sexual.

### Nossos Padrões

Exemplos de comportamento que contribuem para a criação de um ambiente positivo incluem:

- Usar linguagem acolhedora e inclusiva
- Ser respeitoso com diferentes pontos de vista e experiências
- Aceitar críticas construtivas com elegância
- Focar no que é melhor para a comunidade
- Mostrar empatia para com outros membros da comunidade

### Aplicação

Casos de comportamento abusivo, de assédio ou inaceitável podem ser relatados entrando em contato com a equipe do projeto. Todas as reclamações serão revisadas e investigadas de forma rápida e justa.

## Como Começar

### Pré-requisitos

Antes de contribuir, certifique-se de que você possui:

- Node.js 18.0.0 ou superior
- npm 8.0.0 ou superior
- Git
- Um editor de código (VS Code recomendado)
- Conhecimento básico de React, TypeScript e Tailwind CSS

### Configurando o Ambiente de Desenvolvimento

1. **Faça um Fork do Repositório**
   ```bash
   # Faça um fork do repositório no GitHub, depois clone seu fork
   git clone https://github.com/SEU_USUARIO/gg-ai-labs-dashboard.git
   cd gg-ai-labs-dashboard
   ```

2. **Adicionar Remoto Upstream**
   ```bash
   git remote add upstream https://github.com/gg-ai-labs/dashboard.git
   ```

3. **Instalar Dependências**
   ```bash
   npm install
   ```

4. **Configurar Ambiente**
   ```bash
   cp .env.example .env
   # Edite o .env com sua configuração
   ```

5. **Iniciar Servidor de Desenvolvimento**
   ```bash
   npm run dev
   ```

6. **Verificar Configuração**
   - Abra http://localhost:5173
   - Garanta que o dashboard carrega corretamente
   - Teste a funcionalidade de alternância de idioma

## Processo de Desenvolvimento

### Estratégia de Branching

Usamos um modelo de branching inspirado no Git Flow:

- `main`: Código pronto para produção
- `develop`: Branch de integração para funcionalidades
- `feature/*`: Novas funcionalidades e melhorias
- `bugfix/*`: Correções de bugs
- `hotfix/*`: Correções críticas de produção

### Fluxo de Trabalho

1. **Criar Branch de Funcionalidade**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/nome-da-sua-funcionalidade
   ```

2. **Fazer Alterações**
   - Escreva o código seguindo nossos padrões
   - Adicione testes para novas funcionalidades
   - Atualize a documentação conforme necessário

3. **Fazer Commit das Alterações**
   ```bash
   git add .
   git commit -m "feat: adiciona descrição da nova funcionalidade"
   ```

4. **Enviar e Criar PR**
   ```bash
   git push origin feature/nome-da-sua-funcionalidade
   # Crie um pull request no GitHub
   ```

## Diretrizes de Contribuição

### Tipos de Contribuição

Aceitamos vários tipos de contribuições:

- **Correções de Bugs**: Corrigir problemas e melhorar a estabilidade
- **Funcionalidades**: Adicionar novas funcionalidades
- **Documentação**: Melhorar guias e documentação da API
- **Desempenho**: Otimizar o código e reduzir o tamanho do bundle
- **Acessibilidade**: Tornar o dashboard mais acessível
- **Internacionalização**: Adicionar suporte a novos idiomas
- **Testes**: Melhorar a cobertura e a qualidade dos testes

### Antes de Começar

1. **Verificar Issues Existentes**: Procure por issues ou discussões existentes
2. **Criar uma Issue**: Para mudanças significativas, crie uma issue primeiro
3. **Discutir a Abordagem**: Obtenha feedback sobre a solução proposta
4. **Seguir os Padrões**: Garanta que seu código siga nossas diretrizes

### O Que Estamos Procurando

#### Prioridade Alta
- Integração com a API do Obsidian
- Conexões de dados em tempo real
- Integrações com serviços de IA
- Otimizações de desempenho
- Melhorias de acessibilidade

#### Prioridade Média
- Novos componentes de visualização
- Suporte a idiomas adicionais
- Melhorias na experiência móvel
- Infraestrutura de testes
- Melhorias na documentação

#### Prioridade Baixa
- Polimento da UI e animações
- Refatoração de código
- Melhorias na experiência do desenvolvedor

## Processo de Pull Request

### Requisitos do PR

Antes de enviar um pull request, garanta que:

- [ ] O código segue nossas diretrizes de estilo
- [ ] Todos os testes passam
- [ ] Novas funcionalidades incluem testes
- [ ] A documentação está atualizada
- [ ] As mensagens de commit seguem o formato convencional
- [ ] A descrição do PR está clara e detalhada

### Template de PR

```markdown
## Descrição
Breve descrição das alterações feitas.

## Tipo de Alteração
- [ ] Correção de bug (alteração que não quebra a compatibilidade e corrige um problema)
- [ ] Nova funcionalidade (alteração que não quebra a compatibilidade e adiciona funcionalidade)
- [ ] Alteração que quebra a compatibilidade (correção ou funcionalidade que pode fazer com que a funcionalidade existente não funcione como esperado)
- [ ] Atualização da documentação

## Como Isso Foi Testado?
Descreva os testes que você executou para verificar suas alterações.

## Capturas de Tela (se aplicável)
Adicione capturas de tela para ajudar a explicar suas alterações.

## Checklist
- [ ] Meu código segue as diretrizes de estilo
- [ ] Eu fiz uma auto-revisão do meu código
- [ ] Eu comentei meu código, especialmente em áreas difíceis de entender
- [ ] Eu fiz as alterações correspondentes na documentação
- [ ] Minhas alterações não geram novos avisos
- [ ] Eu adicionei testes que provam que minha correção é eficaz ou que minha funcionalidade funciona
- [ ] Testes de unidade novos e existentes passam localmente com minhas alterações
```

### Processo de Revisão

1. **Verificações Automatizadas**: O pipeline de CI/CD é executado automaticamente
2. **Revisão de Código**: Membros da equipe revisam seu código
3. **Feedback**: Atenda a quaisquer alterações solicitadas
4. **Aprovação**: Obtenha a aprovação dos mantenedores
5. **Merge**: O código é mesclado na branch de destino

### Critérios de Revisão

Os revisores verificarão:

- **Funcionalidade**: O código funciona como esperado?
- **Qualidade do Código**: O código está limpo e de fácil manutenção?
- **Desempenho**: Afeta o desempenho da aplicação?
- **Segurança**: Existem preocupações de segurança?
- **Testes**: O código está adequadamente testado?
- **Documentação**: A documentação está atualizada?

## Relatório de Issues

### Relatórios de Bugs

Ao relatar bugs, inclua:

```markdown
**Descreva o bug**
Uma descrição clara e concisa do que é o bug.

**Para Reproduzir**
Passos para reproduzir o comportamento:
1. Vá para '...'
2. Clique em '....'
3. Role para baixo até '....'
4. Veja o erro

**Comportamento esperado**
Uma descrição clara e concisa do que você esperava que acontecesse.

**Capturas de tela**
Se aplicável, adicione capturas de tela para ajudar a explicar seu problema.

**Ambiente:**
 - SO: [ex. iOS]
 - Navegador [ex. chrome, safari]
 - Versão [ex. 22]

**Contexto adicional**
Adicione qualquer outro contexto sobre o problema aqui.
```

### Solicitações de Funcionalidades

Para solicitações de funcionalidades, inclua:

```markdown
**Sua solicitação de funcionalidade está relacionada a um problema? Por favor, descreva.**
Uma descrição clara e concisa de qual é o problema.

**Descreva a solução que você gostaria**
Uma descrição clara e concisa do que você quer que aconteça.

**Descreva as alternativas que você considerou**
Uma descrição clara e concisa de quaisquer soluções ou funcionalidades alternativas que você considerou.

**Contexto adicional**
Adicione qualquer outro contexto ou capturas de tela sobre a solicitação de funcionalidade aqui.
```

## Padrões de Codificação

### Diretrizes de TypeScript

```typescript
// Use tipos explícitos
interface UserData {
  id: string;
  name: string;
  email: string;
}

// Prefira interfaces a tipos para formas de objeto
interface ComponentProps {
  title: string;
  data: UserData[];
  onAction?: () => void;
}

// Use tipagem de função adequada
const processData = (data: UserData[]): ProcessedData[] => {
  return data.map(user => ({
    ...user,
    displayName: user.name.toUpperCase()
  }));
};
```

### Diretrizes de Componentes React

```typescript
// Use componentes funcionais com TypeScript
interface MetricCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, trend }) => {
  const { t } = useLanguage();
  
  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-sm font-medium text-slate-400">{t(title)}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
};

export default MetricCard;
```

### Diretrizes de CSS/Tailwind

```typescript
// Use espaçamento consistente (sistema de 8px)
className="p-6 mb-8 space-y-4"

// Use classes de cores semânticas
className="bg-slate-800/50 text-white border-slate-700/50"

// Use design responsivo
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"

// Use estados de hover e transições
className="hover:bg-slate-800/70 transition-all duration-300"
```

### Organização de Arquivos

```
src/
├── components/
│   ├── ui/              # Componentes de UI reutilizáveis
│   ├── features/        # Componentes específicos de funcionalidades
│   └── layout/          # Componentes de layout
├── hooks/               # Hooks React customizados
├── services/            # Serviços de API
├── utils/               # Funções utilitárias
├── types/               # Definições de tipo TypeScript
└── contexts/            # Contextos React
```

### Convenções de Nomenclatura

- **Componentes**: PascalCase (`MetricCard.tsx`)
- **Arquivos**: camelCase (`apiService.ts`)
- **Variáveis**: camelCase (`userData`)
- **Constantes**: UPPER_SNAKE_CASE (`API_ENDPOINTS`)
- **Interfaces**: PascalCase com nomes descritivos (`UserData`, `APIResponse`)

## Diretrizes de Teste

### Teste de Unidade

```typescript
// Teste de componente com React Testing Library
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../contexts/LanguageContext';
import MetricCard from './MetricCard';

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <LanguageProvider>
      {component}
    </LanguageProvider>
  );
};

describe('MetricCard', () => {
  test('renderiza os dados da métrica corretamente', () => {
    renderWithProviders(
      <MetricCard
        title="Crescimento da Receita"
        value="$2.4M"
        trend="up"
      />
    );
    
    expect(screen.getByText('$2.4M')).toBeInTheDocument();
  });
});
```

### Teste de Integração

```typescript
// API integration testing
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { obsidianAPI } from '../services/obsidianApi';

const server = setupServer(
  rest.get('/api/notes', (req, res, ctx) => {
    return res(ctx.json({ notes: [] }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetches notes from API', async () => {
  const notes = await obsidianAPI.getNotes();
  expect(notes).toEqual({ notes: [] });
});
```

### Test Coverage

Aim for:
- **Unit Tests**: 80%+ coverage for utilities and hooks
- **Component Tests**: 70%+ coverage for UI components
- **Integration Tests**: Key user flows and API integrations

## Documentation

### Code Documentation

```typescript
/**
 * Processes user data and returns formatted results
 * @param users - Array of user data objects
 * @param options - Processing options
 * @returns Processed user data with additional fields
 */
export const processUsers = (
  users: UserData[],
  options: ProcessingOptions = {}
): ProcessedUserData[] => {
  // Implementation
};
```

### README Updates

When adding features, update:
- Feature list in README.md
- Installation instructions (if needed)
- Usage examples
- API documentation

### Changelog

Follow [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [1.2.0] - 2024-01-15

### Added
- New AI insights integration
- Real-time data synchronization

### Changed
- Improved dashboard performance
- Updated language translations

### Fixed
- Fixed memory leak in WebSocket connections
- Resolved mobile layout issues
```

## Recognition

### Contributors

We recognize contributors in several ways:

- **README**: Contributors listed in README.md
- **Releases**: Major contributors mentioned in release notes
- **Social Media**: Feature announcements credit contributors
- **Swag**: Active contributors receive GG.AI Labs merchandise

### Contribution Levels

- **First-time Contributor**: Welcome package and mentorship
- **Regular Contributor**: Recognition in project communications
- **Core Contributor**: Invitation to planning discussions
- **Maintainer**: Commit access and review responsibilities

## Getting Help

### Communication Channels

- **GitHub Issues**: Technical questions and bug reports
- **GitHub Discussions**: General questions and ideas
- **Discord**: Real-time chat with the community
- **Email**: Direct contact for sensitive issues

### Mentorship

New contributors can request mentorship:

1. Comment on a "good first issue"
2. Tag @mentors in your comment
3. A mentor will be assigned to help you

### Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Testing Library Docs](https://testing-library.com/)

## License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to GG.AI Labs CEO Dashboard! Your efforts help make this project better for everyone. 🚀