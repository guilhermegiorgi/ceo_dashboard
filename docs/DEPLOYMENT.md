# 🚀 Guia de Implantação - CEO Dashboard Melhorado

## Visão Geral

Este documento descreve o processo completo de implantação das melhorias no sistema CEO Dashboard, incluindo integração avançada com Obsidian, backup automático, e infraestrutura em nuvem.

## 📋 Pré-requisitos

### Sistema Local
- Node.js 18+ e npm
- Docker & Docker Compose
- Git
- Obsidian instalado com vault configurado

### Infraestrutura em Nuvem (VPS)
- Ubuntu 20.04+ ou Debian 11+
- 2GB RAM mínimo (4GB recomendado)
- 20GB espaço em disco
- Acesso SSH
- Domínio (opcional)

### Serviços Externos
- Conta AWS/Google Cloud para backup
- API do Cognito configurada
- Vault Obsidian com permissões de API

## 🏗️ Arquitetura Proposta

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Obsidian      │    │   CEO Dashboard │    │   VPS (Docker)  │
│   Vault         │◄──►│   Local/Cloud   │◄──►│   PostgreSQL    │
│                 │    │                 │    │   Redis         │
│ • Notas         │    │ • Frontend      │    │   Nginx         │
│ • Projetos      │    │ • Backend API   │    │   Monitoring    │
│ • Insights      │    │ • Sync Engine   │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 ▼
                    ┌─────────────────┐
                    │   Backup Cloud  │
                    │   (AWS S3/GCS)  │
                    └─────────────────┘
```

## 📦 Instalação Local (Desenvolvimento)

### 1. Clonagem e Setup Inicial

```bash
# Clone o repositório
git clone https://github.com/ggailabs/ceo-dashboard.git
cd ceo-dashboard

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env
```

### 2. Configuração do Banco Local

```bash
# Execute setup do banco
npm run setup

# Execute migrações
npm run migrate
```

### 3. Configuração do Obsidian

```bash
# Instale plugins necessários no Obsidian
# 1. Obsidian Git
# 2. Dataview
# 3. Kanban
# 4. Charts (opcional)

# Configure permissões da API
# Edite .obsidian/workspace.json para permitir API
```

### 4. Inicialização do Sistema

```bash
# Inicie em modo desenvolvimento
npm run dev

# Acesse http://localhost:5173 (frontend)
# API disponível em http://localhost:3001
```

## 🐳 Dockerização e Containerização

### Dockerfile Otimizado

```dockerfile
# Dockerfile para produção
FROM node:18-alpine AS base

# Instale dependências do sistema
RUN apk add --no-cache \
    sqlite \
    redis \
    git \
    openssh-client

# Crie usuário não-root
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Configure diretório da aplicação
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Copie código fonte
COPY . .

# Configure permissões
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exponha portas
EXPOSE 3001 5173

# Comando de inicialização
CMD ["npm", "run", "server"]
```

### Docker Compose para Desenvolvimento

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3001:3001"
      - "5173:5173"
    environment:
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=ceodashboard
      - POSTGRES_USER=ceo
      - POSTGRES_PASSWORD=secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## ☁️ Implantação em VPS

### 1. Preparação do Servidor

```bash
# Conecte via SSH
ssh user@your-vps-ip

# Atualize o sistema
sudo apt update && sudo apt upgrade -y

# Instale Docker e Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Instale Nginx
sudo apt install nginx -y

# Instale Certbot (SSL)
sudo apt install certbot python3-certbot-nginx -y
```

### 2. Configuração do Firewall

```bash
# Configure UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

### 3. Deploy da Aplicação

```bash
# Clone o repositório na VPS
git clone https://github.com/ggailabs/ceo-dashboard.git
cd ceo-dashboard

# Configure produção
cp .env.example .env.production
# Edite .env.production com configurações reais

# Build e deploy
docker-compose -f docker-compose.prod.yml up -d --build
```

### 4. Configuração do Nginx

```nginx
# /etc/nginx/sites-available/ceo-dashboard
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Ative o site
sudo ln -s /etc/nginx/sites-available/ceo-dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 5. Configuração SSL

```bash
# Obtenha certificado SSL
sudo certbot --nginx -d your-domain.com

# Configure renovação automática
sudo crontab -e
# Adicione: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔄 Sistema de Backup Automático

### 1. Backup do Vault Obsidian

```bash
#!/bin/bash
# scripts/backup-vault.sh

VAULT_PATH="/home/guilherme/Documentos/Guilherme Giorgi - Obsidian"
BACKUP_DIR="/home/guilherme/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Crie backup local
tar -czf "$BACKUP_DIR/vault_$TIMESTAMP.tar.gz" -C "$VAULT_PATH" .

# Sincronize com Git
cd "$VAULT_PATH"
git add .
git commit -m "Auto-backup: $TIMESTAMP"
git push origin main

# Upload para nuvem (AWS S3)
aws s3 cp "$BACKUP_DIR/vault_$TIMESTAMP.tar.gz" s3://your-backup-bucket/

# Limpe backups antigos (mantenha últimos 7 dias)
find "$BACKUP_DIR" -name "vault_*.tar.gz" -mtime +7 -delete
```

### 2. Backup do Banco de Dados

```bash
#!/bin/bash
# scripts/backup-db.sh

DB_CONTAINER="ceo-dashboard-db-1"
BACKUP_DIR="/home/guilherme/backups/db"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Backup PostgreSQL
docker exec $DB_CONTAINER pg_dump -U ceo ceodashboard > "$BACKUP_DIR/db_$TIMESTAMP.sql"

# Compacte e envie para nuvem
gzip "$BACKUP_DIR/db_$TIMESTAMP.sql"
aws s3 cp "$BACKUP_DIR/db_$TIMESTAMP.sql.gz" s3://your-backup-bucket/db/

# Limpe backups antigos
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +30 -delete
```

### 3. Agendamento de Backups

```bash
# Adicione ao crontab
crontab -e

# Backup do vault a cada 6 horas
0 */6 * * * /home/guilherme/ceo-dashboard/scripts/backup-vault.sh

# Backup do banco diariamente às 2:00
0 2 * * * /home/guilherme/ceo-dashboard/scripts/backup-db.sh

# Backup completo semanalmente (domingos às 3:00)
0 3 * * 0 /home/guilherme/ceo-dashboard/scripts/backup-full.sh
```

## 📊 Monitoramento e Observabilidade

### 1. Configuração do Prometheus + Grafana

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  grafana_data:
```

### 2. Métricas da Aplicação

```javascript
// server/metrics.js
const promClient = require('prom-client');

// Crie registro de métricas
const register = new promClient.Registry();

// Adicione métricas padrão
promClient.collectDefaultMetrics({ register });

// Métrica customizada
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

register.registerMetric(httpRequestDuration);

module.exports = { register, httpRequestDuration };
```

### 3. Logs Centralizados

```javascript
// server/logger.js
const winston = require('winston');

// Configure Winston com múltiplos transportes
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // Console para desenvolvimento
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Arquivo para produção
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

module.exports = logger;
```

## 🔧 Configuração de Produção

### Variáveis de Ambiente

```bash
# .env.production
# Aplicação
NODE_ENV=production
PORT=3001

# Banco de Dados PostgreSQL
DATABASE_URL=postgresql://ceo:secure_password@localhost:5432/ceodashboard

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secure-jwt-secret-key-here
JWT_EXPIRES_IN=24h

# Obsidian
OBSIDIAN_API_URL=http://localhost:27123
OBSIDIAN_API_KEY=your_obsidian_api_key
OBSIDIAN_VAULT_NAME="Guilherme Giorgi - Obsidian"

# Cognito
COGNITO_API_URL=https://your-cognito-api.com
COGNITO_API_KEY=your_cognito_api_key

# Backup AWS S3
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
S3_BUCKET_NAME=your-ceo-dashboard-backups

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### Otimização de Performance

```javascript
// server/app.js - Middleware de performance
const compression = require('compression');
const helmet = require('helmet');

// Segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Compressão
app.use(compression());

// Cache headers
app.use(express.static('dist', {
  maxAge: '1y',
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
```

## 🚀 CI/CD com GitHub Actions

### Workflow de Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy to VPS

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm test
      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.0
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /home/ubuntu/ceo-dashboard
            git pull origin main
            docker-compose -f docker-compose.prod.yml down
            docker-compose -f docker-compose.prod.yml up -d --build
```

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. Erro de Conexão com Obsidian
```bash
# Verifique se o Obsidian está rodando
ps aux | grep obsidian

# Verifique configurações da API
curl http://localhost:27123/

# Logs do Obsidian
tail -f ~/Library/Logs/Obsidian/obsidian.log
```

#### 2. Problemas de Backup
```bash
# Verifique permissões do Git
cd /path/to/vault
git status

# Teste conexão AWS
aws s3 ls s3://your-bucket-name/

# Verifique logs de backup
tail -f /var/log/backup.log
```

#### 3. Performance do Banco
```bash
# Verifique conexões ativas
docker exec ceo-dashboard-db-1 psql -U ceo -d ceodashboard -c "SELECT count(*) FROM pg_stat_activity;"

# Otimize queries lentas
docker exec ceo-dashboard-db-1 psql -U ceo -d ceodashboard -c "SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

## 📞 Suporte e Manutenção

### Monitoramento Contínuo
- Logs em `/var/log/ceo-dashboard/`
- Métricas em Grafana (porta 3000)
- Alertas via email/Slack

### Atualizações
```bash
# Atualização da aplicação
cd /home/ubuntu/ceo-dashboard
git pull origin main
docker-compose -f docker-compose.prod.yml up -d --build

# Atualização do sistema
sudo apt update && sudo apt upgrade -y
docker system prune -f
```

### Backup de Emergência
```bash
# Script de recuperação completa
#!/bin/bash
# scripts/recovery.sh

# Pare serviços
docker-compose down

# Restaure banco
aws s3 cp s3://your-bucket/db/latest.sql.gz .
gunzip latest.sql.gz
docker exec -i ceo-dashboard-db-1 psql -U ceo ceodashboard < latest.sql

# Restaure vault
aws s3 cp s3://your-bucket/vault/latest.tar.gz .
tar -xzf latest.tar.gz -C /path/to/vault

# Reinicie serviços
docker-compose up -d
```

---

## 📋 Checklist de Implantação

- [ ] Servidor VPS provisionado
- [ ] Docker e Docker Compose instalados
- [ ] Nginx configurado com SSL
- [ ] Banco PostgreSQL configurado
- [ ] Redis configurado
- [ ] Aplicação deployada
- [ ] Backup automático configurado
- [ ] Monitoramento ativo
- [ ] Domínio configurado
- [ ] Testes funcionais realizados
- [ ] Documentação atualizada

## 🎯 Próximos Passos

1. **Teste em Produção**: Execute testes completos da aplicação
2. **Monitoramento**: Configure alertas e dashboards
3. **Otimização**: Ajuste performance baseado em métricas
4. **Backup**: Teste procedimentos de recuperação
5. **Documentação**: Atualize runbooks e procedimentos

---

*Esta documentação é mantida automaticamente. Última atualização: $(date)*
