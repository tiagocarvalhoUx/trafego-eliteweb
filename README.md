# Social Analytics - EliteWeb Platform

Plataforma completa de **automação de marketing e monitoramento de redes sociais** para Instagram e TikTok.

---

## Funcionalidades

- **Dashboard analítico** com métricas em tempo real
- **Monitoramento de engajamento** diário e semanal (curtidas, comentários, alcance, visualizações)
- **Crescimento de seguidores** com gráficos históricos
- **Automação de leads** por palavra-chave em comentários (envia DM automática)
- **Captura automática de leads** com funil (novo → contatado → convertido)
- **Sugestões inteligentes** de horários de postagem
- **Identificação de posts virais**
- **Exportação de relatórios** em PDF e CSV
- **Metas de crescimento** com progresso visual
- **Notificações** de crescimento e metas atingidas
- **Autenticação JWT** segura com bcrypt

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | SvelteKit + TypeScript + Tailwind CSS + ApexCharts |
| Backend | Node.js + Express.js + TypeScript |
| Banco de Dados | MySQL |
| Autenticação | JWT + bcrypt |
| Agendamento | node-cron |
| APIs | Instagram Graph API, TikTok For Developers |

---

## Estrutura do Projeto

```
trafego-eliteweb/
├── backend/
│   └── src/
│       ├── config/        # Database, env, migrations
│       ├── controllers/   # Request handlers
│       ├── services/      # Business logic + API integrations
│       ├── routes/        # Express routes
│       ├── middlewares/   # Auth, CORS, validation
│       ├── cron/          # Scheduled jobs
│       └── server.ts      # Entry point
└── frontend/
    └── src/
        ├── routes/        # SvelteKit pages
        ├── lib/
        │   ├── components/ # Svelte components
        │   ├── services/   # API calls
        │   └── stores/     # Svelte stores
        └── app.css        # Global styles
```

---

## Configuração e Instalação

### 1. Requisitos

- Node.js 18+
- MySQL 8.0+
- Contas de desenvolvedor: Meta for Developers (Instagram) e TikTok for Developers

### 2. Backend

```bash
cd backend
npm install

# Copiar e configurar variáveis de ambiente
cp .env.example .env
# Editar o .env com suas credenciais

# Criar banco de dados e tabelas
npm run migrate

# Iniciar em desenvolvimento
npm run dev
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 4. Variáveis de Ambiente (backend/.env)

| Variável | Descrição |
|----------|-----------|
| `DB_HOST` | Host do MySQL (padrão: localhost) |
| `DB_USER` | Usuário MySQL |
| `DB_PASSWORD` | Senha MySQL |
| `DB_NAME` | Nome do banco (padrão: social_automation) |
| `JWT_SECRET` | Chave secreta JWT (use string longa e aleatória) |
| `INSTAGRAM_APP_ID` | App ID do Meta for Developers |
| `INSTAGRAM_APP_SECRET` | App Secret do Meta |
| `INSTAGRAM_REDIRECT_URI` | URI de callback do Instagram |
| `TIKTOK_CLIENT_KEY` | Client Key do TikTok for Developers |
| `TIKTOK_CLIENT_SECRET` | Client Secret do TikTok |
| `SMTP_*` | Configurações de email para notificações |

---

## API Endpoints

### Autenticação
| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/auth/register` | Cadastrar novo usuário |
| POST | `/api/auth/login` | Fazer login |
| GET | `/api/auth/me` | Dados do usuário logado |

### Contas Sociais
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/social/accounts` | Listar contas conectadas |
| GET | `/api/social/instagram/auth-url` | URL para conectar Instagram |
| GET | `/api/social/tiktok/auth-url` | URL para conectar TikTok |
| DELETE | `/api/social/accounts/:id` | Desconectar conta |
| POST | `/api/social/collect/:contaId` | Forçar coleta de dados |

### Analytics
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/analytics/dashboard` | Resumo geral |
| GET | `/api/analytics/engagement?days=30` | Dados de engajamento |
| GET | `/api/analytics/followers?days=30` | Crescimento de seguidores |
| GET | `/api/analytics/top-posts` | Top posts por engajamento |
| GET | `/api/analytics/viral-posts` | Posts com potencial viral |
| GET | `/api/analytics/best-times` | Melhores horários para postar |
| GET | `/api/analytics/export/pdf` | Exportar relatório PDF |
| GET | `/api/analytics/export/csv/engagement` | Exportar engajamento CSV |

### Leads
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/leads` | Listar leads (com filtros e paginação) |
| POST | `/api/leads` | Criar lead manualmente |
| PUT | `/api/leads/:id/status` | Atualizar status do lead |
| DELETE | `/api/leads/:id` | Remover lead |
| GET | `/api/leads/stats` | Estatísticas de leads |
| GET | `/api/leads/export/csv` | Exportar leads CSV |

### Automações
| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/automation` | Listar automações |
| POST | `/api/automation` | Criar automação |
| PUT | `/api/automation/:id/toggle` | Ativar/desativar |
| DELETE | `/api/automation/:id` | Remover automação |
| GET | `/api/automation/goals` | Listar metas |
| POST | `/api/automation/goals` | Criar meta |
| GET | `/api/automation/notifications` | Notificações |

---

## Cron Jobs

| Horário | Tarefa |
|---------|--------|
| Diariamente às 23:00 | Coleta de dados de todas as contas |
| A cada 30 minutos | Ciclo de automações (verifica comentários) |
| Domingos às 08:00 | Relatório semanal + verificação de metas |

---

## Banco de Dados

Tabelas criadas automaticamente via `npm run migrate`:

- `usuarios` - Usuários da plataforma
- `contas_sociais` - Contas conectadas (Instagram/TikTok)
- `posts` - Posts coletados
- `engajamento` - Métricas por post
- `seguidores` - Histórico de seguidores
- `leads` - Leads capturados
- `automacoes` - Regras de automação
- `notificacoes` - Notificações in-app
- `metas` - Metas de crescimento

---

## Segurança

- Senhas com bcrypt (salt 12)
- JWT com expiração configurável
- Rate limiting nas rotas de auth (10 req/hora)
- Rate limiting geral (100 req/15min)
- CORS configurado por domínio
- Helmet.js para headers de segurança
- Validação de dados com Joi
- Queries parametrizadas (proteção SQL injection)
