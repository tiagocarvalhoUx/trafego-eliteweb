# PROMPT PROFISSIONAL -- PLATAFORMA DE AUTOMAÇÃO E SOCIAL ANALYTICS (SAAS)

## Objetivo

Desenvolver uma plataforma completa de **automação de marketing e
monitoramento de redes sociais**, focada em **Instagram e TikTok**,
permitindo:

-   Automação de interações
-   Captura automática de leads
-   Monitoramento de engajamento
-   Dashboard analítico
-   Relatórios de crescimento
-   Sugestões inteligentes de conteúdo

A aplicação deve ser desenvolvida seguindo **boas práticas de
desenvolvimento full stack**, arquitetura escalável e segura.

------------------------------------------------------------------------

# 1. Arquitetura Geral

O sistema deve ser dividido em:

-   Frontend
-   Backend
-   Banco de Dados
-   Sistema de automações
-   Sistema de analytics
-   Sistema de relatórios

Arquitetura recomendada:

Arquitetura modular + API REST.

------------------------------------------------------------------------

# 2. Tecnologias Utilizadas

## Frontend

Utilizar:

-   SvelteKit
-   TypeScript
-   Tailwind CSS
-   Chart.js ou ApexCharts
-   Axios

Funções do Frontend:

-   Dashboard de métricas
-   Interface de automação
-   Visualização de engajamento
-   Configuração de contas sociais
-   Visualização de leads
-   Configuração de campanhas

------------------------------------------------------------------------

## Backend

Utilizar:

-   Node.js
-   Express.js
-   TypeScript
-   JWT Authentication
-   Node Cron

Funções do backend:

-   Integração com APIs sociais
-   Coleta automática de dados
-   Processamento de métricas
-   Sistema de automação
-   Sistema de notificações
-   API REST

------------------------------------------------------------------------

## Banco de Dados

Utilizar:

MySQL

Estrutura inicial:

### Tabela usuarios

-   id
-   nome
-   email
-   senha_hash
-   data_criacao

### Tabela contas_sociais

-   id
-   usuario_id
-   plataforma
-   access_token
-   data_conexao

### Tabela posts

-   id
-   conta_id
-   id_post_plataforma
-   data_postagem
-   legenda

### Tabela engajamento

-   id
-   post_id
-   data_coleta
-   curtidas
-   comentarios
-   compartilhamentos
-   visualizacoes
-   alcance

### Tabela seguidores

-   id
-   conta_id
-   total_seguidores
-   data_registro

### Tabela leads

-   id
-   nome
-   usuario
-   origem
-   data_captura
-   status

------------------------------------------------------------------------

# 3. Integração com Redes Sociais

## Instagram

Utilizar:

Instagram Graph API

Coletar:

-   curtidas
-   comentários
-   seguidores
-   alcance
-   impressões
-   taxa de engajamento

------------------------------------------------------------------------

## TikTok

Utilizar:

TikTok For Developers API

Coletar:

-   visualizações
-   curtidas
-   comentários
-   compartilhamentos
-   crescimento de seguidores

------------------------------------------------------------------------

# 4. Sistema de Monitoramento de Engajamento

Criar módulo chamado:

Social Analytics

Funcionalidades:

### Coleta automática

Utilizar:

node-cron

Executar tarefas:

-   coleta diária de dados
-   coleta semanal
-   geração de relatórios

Exemplo:

-   coleta diária às 23:00
-   relatório semanal aos domingos

------------------------------------------------------------------------

# 5. Dashboard de Métricas

Criar um dashboard com:

## Métricas principais

-   crescimento de seguidores
-   taxa de engajamento
-   curtidas por período
-   comentários por período
-   posts com maior alcance

------------------------------------------------------------------------

## Gráficos

Utilizar Chart.js ou ApexCharts.

Gráficos:

-   crescimento de seguidores
-   engajamento por dia
-   engajamento por semana
-   comparação entre posts

------------------------------------------------------------------------

# 6. Sistema de Automação de Leads

Criar um sistema que permita:

## Automação por comentário

Exemplo:

Se usuário comentar:

"GUIA"

O sistema envia automaticamente:

Mensagem direta com link.

------------------------------------------------------------------------

## Fluxo automatizado

Fluxo:

1.  Usuário comenta palavra chave
2.  Sistema envia DM automática
3.  Usuário responde
4.  Lead é registrado no banco de dados

------------------------------------------------------------------------

# 7. Sistema de Inteligência de Conteúdo (Extra)

Adicionar módulo opcional de análise.

Funções:

-   identificar posts com melhor desempenho
-   prever possíveis posts virais
-   sugerir melhores horários de postagem

------------------------------------------------------------------------

# 8. Dashboard Administrativo

Criar páginas:

## Página Home

Mostrar:

-   total de leads
-   seguidores totais
-   taxa de engajamento
-   crescimento semanal

------------------------------------------------------------------------

## Página Analytics

Mostrar:

-   métricas diárias
-   métricas semanais
-   métricas mensais

------------------------------------------------------------------------

## Página Leads

Mostrar:

-   lista de leads
-   origem
-   data
-   status

------------------------------------------------------------------------

# 9. Segurança

Implementar:

-   autenticação JWT
-   criptografia de senha com bcrypt
-   proteção CORS
-   validação com Zod ou Joi

------------------------------------------------------------------------

# 10. Estrutura de Pastas

Backend

backend/ controllers/ services/ routes/ models/ middlewares/ cron/
config/ server.ts

------------------------------------------------------------------------

Frontend

frontend/ components/ routes/ services/ stores/ layouts/ lib/

------------------------------------------------------------------------

# 11. Funcionalidades Extras

Adicionar:

-   exportação de relatórios em PDF
-   exportação de dados em CSV
-   alertas de crescimento de seguidores
-   notificação de post viral
-   sistema de metas de crescimento

------------------------------------------------------------------------

# 12. Objetivo Final

Criar uma **plataforma profissional de automação e analytics para redes
sociais**, permitindo:

-   acompanhar crescimento das redes
-   medir engajamento diário e semanal
-   capturar leads automaticamente
-   automatizar interações
-   melhorar conversões

------------------------------------------------------------------------

# Instruções finais para geração do projeto

Gerar:

-   código completo
-   frontend + backend
-   estrutura de banco
-   documentação
-   comentários no código
