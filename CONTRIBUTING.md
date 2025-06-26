# Contributing to GG.AI Labs CEO Dashboard

Thank you for your interest in contributing to the GG.AI Labs CEO Dashboard! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Contribution Guidelines](#contribution-guidelines)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)

## Code of Conduct

### Our Pledge

We are committed to making participation in this project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- A code editor (VS Code recommended)
- Basic knowledge of React, TypeScript, and Tailwind CSS

### Setting Up Development Environment

1. **Fork the Repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/gg-ai-labs-dashboard.git
   cd gg-ai-labs-dashboard
   ```

2. **Add Upstream Remote**
   ```bash
   git remote add upstream https://github.com/gg-ai-labs/dashboard.git
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Set Up Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

6. **Verify Setup**
   - Open http://localhost:5173
   - Ensure the dashboard loads correctly
   - Test language toggle functionality

## Development Process

### Branching Strategy

We use a Git Flow-inspired branching model:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features and enhancements
- `bugfix/*`: Bug fixes
- `hotfix/*`: Critical production fixes

### Workflow

1. **Create Feature Branch**
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**
   - Write code following our standards
   - Add tests for new functionality
   - Update documentation as needed

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

4. **Push and Create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create pull request on GitHub
   ```

## Contribution Guidelines

### Types of Contributions

We welcome various types of contributions:

- **Bug Fixes**: Fixing issues and improving stability
- **Features**: Adding new functionality
- **Documentation**: Improving guides and API docs
- **Performance**: Optimizing code and reducing bundle size
- **Accessibility**: Making the dashboard more accessible
- **Internationalization**: Adding new language support
- **Testing**: Improving test coverage and quality

### Before You Start

1. **Check Existing Issues**: Look for existing issues or discussions
2. **Create an Issue**: For significant changes, create an issue first
3. **Discuss Approach**: Get feedback on your proposed solution
4. **Follow Standards**: Ensure your code follows our guidelines

### What We're Looking For

#### High Priority
- Obsidian API integration
- Real-time data connections
- AI service integrations
- Performance optimizations
- Accessibility improvements

#### Medium Priority
- New visualization components
- Additional language support
- Mobile experience improvements
- Testing infrastructure
- Documentation enhancements

#### Low Priority
- UI polish and animations
- Code refactoring
- Developer experience improvements

## Pull Request Process

### PR Requirements

Before submitting a pull request, ensure:

- [ ] Code follows our style guidelines
- [ ] All tests pass
- [ ] New features include tests
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format
- [ ] PR description is clear and detailed

### PR Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## How Has This Been Tested?
Describe the tests you ran to verify your changes.

## Screenshots (if applicable)
Add screenshots to help explain your changes.

## Checklist
- [ ] My code follows the style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs automatically
2. **Code Review**: Team members review your code
3. **Feedback**: Address any requested changes
4. **Approval**: Get approval from maintainers
5. **Merge**: Code is merged into the target branch

### Review Criteria

Reviewers will check for:

- **Functionality**: Does the code work as intended?
- **Code Quality**: Is the code clean and maintainable?
- **Performance**: Does it impact application performance?
- **Security**: Are there any security concerns?
- **Testing**: Is the code adequately tested?
- **Documentation**: Is documentation updated?

## Issue Reporting

### Bug Reports

When reporting bugs, include:

```markdown
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**Environment:**
 - OS: [e.g. iOS]
 - Browser [e.g. chrome, safari]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
```

### Feature Requests

For feature requests, include:

```markdown
**Is your feature request related to a problem? Please describe.**
A clear and concise description of what the problem is.

**Describe the solution you'd like**
A clear and concise description of what you want to happen.

**Describe alternatives you've considered**
A clear and concise description of any alternative solutions or features you've considered.

**Additional context**
Add any other context or screenshots about the feature request here.
```

## Coding Standards

### TypeScript Guidelines

```typescript
// Use explicit types
interface UserData {
  id: string;
  name: string;
  email: string;
}

// Prefer interfaces over types for object shapes
interface ComponentProps {
  title: string;
  data: UserData[];
  onAction?: () => void;
}

// Use proper function typing
const processData = (data: UserData[]): ProcessedData[] => {
  return data.map(user => ({
    ...user,
    displayName: user.name.toUpperCase()
  }));
};
```

### React Component Guidelines

```typescript
// Use functional components with TypeScript
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

### CSS/Tailwind Guidelines

```typescript
// Use consistent spacing (8px system)
className="p-6 mb-8 space-y-4"

// Use semantic color classes
className="bg-slate-800/50 text-white border-slate-700/50"

// Use responsive design
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"

// Use hover states and transitions
className="hover:bg-slate-800/70 transition-all duration-300"
```

### File Organization

```
src/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── features/        # Feature-specific components
│   └── layout/          # Layout components
├── hooks/               # Custom React hooks
├── services/            # API services
├── utils/               # Utility functions
├── types/               # TypeScript type definitions
└── contexts/            # React contexts
```

### Naming Conventions

- **Components**: PascalCase (`MetricCard.tsx`)
- **Files**: camelCase (`apiService.ts`)
- **Variables**: camelCase (`userData`)
- **Constants**: UPPER_SNAKE_CASE (`API_ENDPOINTS`)
- **Interfaces**: PascalCase with descriptive names (`UserData`, `APIResponse`)

## Testing Guidelines

### Unit Testing

```typescript
// Component testing with React Testing Library
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
  test('renders metric data correctly', () => {
    renderWithProviders(
      <MetricCard
        title="Revenue Growth"
        value="$2.4M"
        trend="up"
      />
    );
    
    expect(screen.getByText('$2.4M')).toBeInTheDocument();
  });
});
```

### Integration Testing

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