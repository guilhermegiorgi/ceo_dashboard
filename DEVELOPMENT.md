# Development Guide

## Getting Started

### Prerequisites
- Node.js 18.0.0 or higher
- npm 8.0.0 or higher
- Git
- VS Code (recommended)

### Development Environment Setup

1. **Clone and Install**
```bash
git clone <repository-url>
cd gg-ai-labs-dashboard
npm install
```

2. **Environment Configuration**
```bash
cp .env.example .env
# Edit .env with your API keys and endpoints
```

3. **Start Development Server**
```bash
npm run dev
```

4. **Open Browser**
Navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/              # React components
│   ├── Header.tsx          # Main navigation header
│   ├── MetricCard.tsx      # KPI display cards
│   ├── AIInsightCard.tsx   # AI-generated insights
│   ├── ObsidianIntegration.tsx # Knowledge graph interface
│   ├── ProjectOverview.tsx # Project management panel
│   ├── MCPIntegration.tsx  # MCP services panel
│   └── LanguageToggle.tsx  # Bilingual toggle
├── contexts/               # React contexts
│   └── LanguageContext.tsx # Internationalization
├── services/              # API service layers (planned)
│   ├── obsidianApi.ts     # Obsidian API client
│   ├── embeddingsApi.ts   # AI embeddings service
│   └── mcpClient.ts       # MCP protocol client
├── hooks/                 # Custom React hooks (planned)
│   ├── useObsidian.ts     # Obsidian integration hook
│   ├── useAIInsights.ts   # AI insights hook
│   └── useRealtime.ts     # Real-time data hook
├── utils/                 # Utility functions (planned)
│   ├── cache.ts           # Caching utilities
│   ├── errorHandler.ts    # Error handling
│   └── formatters.ts      # Data formatters
├── types/                 # TypeScript type definitions (planned)
│   ├── obsidian.ts        # Obsidian-related types
│   ├── insights.ts        # AI insights types
│   └── api.ts             # API response types
└── App.tsx                # Main application component
```

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch
git checkout -b feature/new-feature-name

# Make changes
# Test changes
npm run lint
npm run build

# Commit changes
git add .
git commit -m "feat: add new feature description"

# Push and create PR
git push origin feature/new-feature-name
```

### 2. Component Development Guidelines

#### Component Structure
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
      {/* Component content */}
    </div>
  );
};

export default ExampleComponent;
```

#### Styling Guidelines
- Use Tailwind CSS classes
- Follow the established color scheme (slate backgrounds, gradient accents)
- Implement hover states and transitions
- Ensure responsive design
- Use backdrop-blur for glass morphism effects

#### TypeScript Guidelines
- Define interfaces for all props
- Use proper typing for all functions
- Avoid `any` type when possible
- Export types that might be reused

### 3. Adding New Integrations

#### Step 1: Create Service Layer
```typescript
// src/services/newService.ts
class NewService {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_NEW_SERVICE_URL;
    this.apiKey = import.meta.env.VITE_NEW_SERVICE_KEY;
  }

  async fetchData() {
    // Implementation
  }
}

export default new NewService();
```

#### Step 2: Create Custom Hook
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

#### Step 3: Create Component
```typescript
// src/components/NewServiceIntegration.tsx
import React from 'react';
import { useNewService } from '../hooks/useNewService';

const NewServiceIntegration: React.FC = () => {
  const { data, loading, error } = useNewService();

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
      {/* Component implementation */}
    </div>
  );
};

export default NewServiceIntegration;
```

## Code Quality

### Linting and Formatting
```bash
# Run ESLint
npm run lint

# Fix ESLint issues
npm run lint:fix

# Format code with Prettier (if configured)
npm run format
```

### Type Checking
```bash
# Run TypeScript compiler check
npx tsc --noEmit
```

### Testing (Planned)
```bash
# Run unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Internationalization

### Adding New Translations

1. **Update Language Context**
```typescript
// src/contexts/LanguageContext.tsx
const translations = {
  en: {
    'new.key': 'English text',
    // ... existing translations
  },
  pt: {
    'new.key': 'Texto em português',
    // ... existing translations
  }
};
```

2. **Use in Components**
```typescript
const { t } = useLanguage();
return <span>{t('new.key')}</span>;
```

### Translation Guidelines
- Use descriptive keys with dot notation
- Keep translations concise but clear
- Consider cultural context for Portuguese translations
- Test both languages thoroughly

## Performance Optimization

### Bundle Analysis
```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist
```

### Performance Best Practices
- Use React.memo for expensive components
- Implement proper key props for lists
- Avoid unnecessary re-renders
- Use useCallback and useMemo appropriately
- Lazy load components when possible

### Code Splitting Example
```typescript
// Lazy load components
const LazyComponent = React.lazy(() => import('./LazyComponent'));

// Use with Suspense
<Suspense fallback={<div>Loading...</div>}>
  <LazyComponent />
</Suspense>
```

## Debugging

### Development Tools
- React Developer Tools
- Redux DevTools (if using Redux)
- Network tab for API debugging
- Console for error tracking

### Common Issues and Solutions

#### API Connection Issues
```typescript
// Check environment variables
console.log('API URL:', import.meta.env.VITE_API_URL);

// Test API connectivity
fetch(import.meta.env.VITE_API_URL + '/health')
  .then(response => console.log('API Status:', response.status))
  .catch(error => console.error('API Error:', error));
```

#### CORS Issues
- Ensure API server has proper CORS headers
- Check browser network tab for CORS errors
- Verify API endpoints are accessible

#### TypeScript Errors
- Check for missing type definitions
- Ensure proper imports
- Verify interface definitions match usage

## Deployment

### Build Process
```bash
# Create production build
npm run build

# Preview production build locally
npm run preview
```

### Environment Variables
```bash
# Production environment variables
VITE_OBSIDIAN_API_URL=https://your-obsidian-api.com
VITE_EMBEDDINGS_API_URL=https://your-embeddings-api.com
VITE_MCP_ENDPOINT=wss://your-mcp-server.com/mcp
```

### Deployment Checklist
- [ ] All environment variables configured
- [ ] API endpoints accessible from production
- [ ] CORS configured for production domain
- [ ] SSL certificates in place
- [ ] Error monitoring configured
- [ ] Performance monitoring enabled

## Contributing

### Code Review Guidelines
- Ensure code follows established patterns
- Check for proper TypeScript typing
- Verify responsive design works
- Test both English and Portuguese languages
- Ensure accessibility standards are met

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Both languages tested

## Screenshots
Include screenshots for UI changes
```

## Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vite Documentation](https://vitejs.dev/)

### Tools
- [VS Code Extensions](https://marketplace.visualstudio.com/items?itemName=bradlc.vscode-tailwindcss)
- [React Developer Tools](https://chrome.google.com/webstore/detail/react-developer-tools/)
- [Obsidian API Documentation](https://github.com/coddingtonbear/obsidian-local-rest-api)

### Community
- [React Community](https://reactjs.org/community/support.html)
- [TypeScript Community](https://www.typescriptlang.org/community/)
- [Obsidian Community](https://obsidian.md/community)