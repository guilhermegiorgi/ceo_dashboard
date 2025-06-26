# Deployment Guide

## Overview

This guide covers deployment strategies for the GG.AI Labs CEO Dashboard across different environments and platforms.

## Deployment Options

### 1. Static Site Deployment (Recommended for Frontend)

#### Netlify Deployment
```bash
# Build the project
npm run build

# Deploy to Netlify (using Netlify CLI)
npm install -g netlify-cli
netlify login
netlify deploy --prod --dir=dist
```

#### Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

#### GitHub Pages
```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
        env:
          VITE_OBSIDIAN_API_URL: ${{ secrets.VITE_OBSIDIAN_API_URL }}
          VITE_EMBEDDINGS_API_URL: ${{ secrets.VITE_EMBEDDINGS_API_URL }}
          VITE_MCP_ENDPOINT: ${{ secrets.VITE_MCP_ENDPOINT }}
      
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 2. Docker Deployment

#### Dockerfile
```dockerfile
# Build stage
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }

        # Security headers
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;

        # Gzip compression
        gzip on;
        gzip_vary on;
        gzip_min_length 1024;
        gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    }
}
```

#### Docker Compose
```yaml
# docker-compose.yml
version: '3.8'

services:
  dashboard:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped

  # Optional: Add reverse proxy
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
      - ./proxy.conf:/etc/nginx/nginx.conf
    depends_on:
      - dashboard
```

### 3. Kubernetes Deployment

#### Deployment Manifest
```yaml
# k8s/deployment.yml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gg-ai-dashboard
  labels:
    app: gg-ai-dashboard
spec:
  replicas: 3
  selector:
    matchLabels:
      app: gg-ai-dashboard
  template:
    metadata:
      labels:
        app: gg-ai-dashboard
    spec:
      containers:
      - name: dashboard
        image: gg-ai-labs/dashboard:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
---
apiVersion: v1
kind: Service
metadata:
  name: gg-ai-dashboard-service
spec:
  selector:
    app: gg-ai-dashboard
  ports:
  - protocol: TCP
    port: 80
    targetPort: 80
  type: LoadBalancer
```

#### Ingress Configuration
```yaml
# k8s/ingress.yml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gg-ai-dashboard-ingress
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - dashboard.gg-ai-labs.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.gg-ai-labs.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: gg-ai-dashboard-service
            port:
              number: 80
```

## Environment Configuration

### Development Environment
```bash
# .env.development
VITE_OBSIDIAN_API_URL=http://localhost:27123
VITE_EMBEDDINGS_API_URL=http://localhost:8000
VITE_MCP_ENDPOINT=ws://localhost:8080/mcp
VITE_API_TIMEOUT=5000
VITE_ENABLE_DEBUG=true
```

### Staging Environment
```bash
# .env.staging
VITE_OBSIDIAN_API_URL=https://staging-obsidian-api.gg-ai-labs.com
VITE_EMBEDDINGS_API_URL=https://staging-embeddings.gg-ai-labs.com
VITE_MCP_ENDPOINT=wss://staging-mcp.gg-ai-labs.com/mcp
VITE_API_TIMEOUT=10000
VITE_ENABLE_DEBUG=false
```

### Production Environment
```bash
# .env.production
VITE_OBSIDIAN_API_URL=https://obsidian-api.gg-ai-labs.com
VITE_EMBEDDINGS_API_URL=https://embeddings.gg-ai-labs.com
VITE_MCP_ENDPOINT=wss://mcp.gg-ai-labs.com/mcp
VITE_API_TIMEOUT=15000
VITE_ENABLE_DEBUG=false
VITE_SENTRY_DSN=your_sentry_dsn
```

## CI/CD Pipeline

### GitHub Actions Workflow
```yaml
# .github/workflows/ci-cd.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run linter
        run: npm run lint
      
      - name: Run type check
        run: npx tsc --noEmit
      
      - name: Run tests
        run: npm run test
      
      - name: Build
        run: npm run build

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/develop'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for staging
        run: npm run build
        env:
          VITE_OBSIDIAN_API_URL: ${{ secrets.STAGING_OBSIDIAN_API_URL }}
          VITE_EMBEDDINGS_API_URL: ${{ secrets.STAGING_EMBEDDINGS_API_URL }}
          VITE_MCP_ENDPOINT: ${{ secrets.STAGING_MCP_ENDPOINT }}
      
      - name: Deploy to staging
        run: |
          # Deploy to staging environment
          echo "Deploying to staging..."

  deploy-production:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build for production
        run: npm run build
        env:
          VITE_OBSIDIAN_API_URL: ${{ secrets.PROD_OBSIDIAN_API_URL }}
          VITE_EMBEDDINGS_API_URL: ${{ secrets.PROD_EMBEDDINGS_API_URL }}
          VITE_MCP_ENDPOINT: ${{ secrets.PROD_MCP_ENDPOINT }}
      
      - name: Build Docker image
        run: |
          docker build -t gg-ai-labs/dashboard:${{ github.sha }} .
          docker tag gg-ai-labs/dashboard:${{ github.sha }} gg-ai-labs/dashboard:latest
      
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push gg-ai-labs/dashboard:${{ github.sha }}
          docker push gg-ai-labs/dashboard:latest
      
      - name: Deploy to production
        run: |
          # Deploy to production environment
          echo "Deploying to production..."
```

## Monitoring and Observability

### Application Monitoring
```typescript
// src/utils/monitoring.ts
import * as Sentry from '@sentry/react';

// Initialize Sentry
if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
  });
}

// Performance monitoring
export const trackPerformance = (name: string, fn: () => void) => {
  const start = performance.now();
  fn();
  const end = performance.now();
  
  console.log(`${name} took ${end - start} milliseconds`);
  
  // Send to monitoring service
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      message: `Performance: ${name}`,
      level: 'info',
      data: { duration: end - start }
    });
  }
};
```

### Health Check Endpoint
```typescript
// src/utils/healthCheck.ts
export const healthCheck = async () => {
  const checks = {
    obsidian: false,
    embeddings: false,
    mcp: false
  };

  try {
    // Check Obsidian API
    const obsidianResponse = await fetch(
      `${import.meta.env.VITE_OBSIDIAN_API_URL}/health`,
      { timeout: 5000 }
    );
    checks.obsidian = obsidianResponse.ok;
  } catch (error) {
    console.error('Obsidian health check failed:', error);
  }

  // Similar checks for other services...

  return checks;
};
```

## Security Considerations

### Content Security Policy
```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' wss: https:;
  font-src 'self';
">
```

### Environment Variable Security
```bash
# Use secrets management for sensitive data
# Never commit .env files with real credentials
# Use different API keys for different environments
# Rotate API keys regularly
```

### HTTPS Configuration
```nginx
# nginx-ssl.conf
server {
    listen 443 ssl http2;
    server_name dashboard.gg-ai-labs.com;

    ssl_certificate /etc/ssl/certs/dashboard.crt;
    ssl_certificate_key /etc/ssl/private/dashboard.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;

    location / {
        proxy_pass http://dashboard:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Backup and Recovery

### Database Backup (if applicable)
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Backup configuration
kubectl get configmap gg-ai-dashboard-config -o yaml > $BACKUP_DIR/config_$DATE.yaml

# Backup secrets
kubectl get secret gg-ai-dashboard-secrets -o yaml > $BACKUP_DIR/secrets_$DATE.yaml
```

### Disaster Recovery Plan
1. **Service Outage Response**
   - Monitor service health
   - Automatic failover to backup instances
   - Alert notification system

2. **Data Recovery**
   - Regular configuration backups
   - API key backup and rotation
   - Environment variable backup

3. **Rollback Strategy**
   - Keep previous Docker images
   - Blue-green deployment capability
   - Database migration rollback scripts

## Performance Optimization

### Build Optimization
```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import { splitVendorChunkPlugin } from 'vite';

export default defineConfig({
  plugins: [
    react(),
    splitVendorChunkPlugin()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react']
        }
      }
    }
  }
});
```

### CDN Configuration
```javascript
// Use CDN for static assets
const CDN_URL = 'https://cdn.gg-ai-labs.com';

// Configure asset URLs
export const getAssetUrl = (path) => {
  return import.meta.env.PROD ? `${CDN_URL}${path}` : path;
};
```

## Troubleshooting

### Common Deployment Issues

1. **Environment Variables Not Loading**
   - Check variable names start with `VITE_`
   - Verify variables are set in deployment environment
   - Restart application after changes

2. **API Connection Issues**
   - Verify CORS configuration
   - Check network connectivity
   - Validate API endpoints are accessible

3. **Build Failures**
   - Check Node.js version compatibility
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules and reinstall

4. **Docker Issues**
   - Check Dockerfile syntax
   - Verify base image availability
   - Check container logs: `docker logs <container-id>`

### Monitoring Commands
```bash
# Check application logs
kubectl logs -f deployment/gg-ai-dashboard

# Check resource usage
kubectl top pods

# Check service status
kubectl get services

# Check ingress status
kubectl get ingress
```