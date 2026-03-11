# Prompt de Comando para Integração da IA Flow no Dashboard de Automação

Este documento descreve um prompt de comando e as instruções conceituais para integrar a funcionalidade de geração de vídeos utilizando a **IA Flow (Google Flow/Veo)** no dashboard de automação do site `trafego-eliteweb.vercel.app`. O objetivo é permitir que os usuários gerem vídeos a partir de prompts de texto e os publiquem diretamente no Instagram e TikTok.

## Visão Geral da Integração

A integração da IA Flow no dashboard de automação envolverá as seguintes etapas e componentes:

1.  **Interface de Criação de Vídeo**: Adicionar uma nova opção ou um fluxo de trabalho específico dentro da funcionalidade "Nova Automação" para a geração de vídeos.
2.  **Entrada de Prompt**: Permitir que o usuário insira um prompt de texto detalhado para descrever o vídeo desejado.
3.  **Geração de Vídeo via IA Flow**: Utilizar a API da IA Flow (Google Flow/Veo) para processar o prompt e gerar o conteúdo do vídeo.
4.  **Revisão e Edição (Opcional)**: Oferecer uma etapa para o usuário revisar o vídeo gerado e, se necessário, fazer pequenas edições ou ajustes no prompt para regeneração.
5.  **Publicação Automatizada**: Após a aprovação do vídeo, publicá-lo automaticamente nas contas conectadas do Instagram e TikTok.

## Prompt de Comando Sugerido

Para iniciar a criação de uma nova automação de vídeo, o usuário precisaria de um prompt de comando que guie a IA Flow. Este prompt deve ser configurável e pode incluir variáveis para personalização.

```
Crie um vídeo curto (até 60 segundos) para redes sociais com o seguinte tema: "[TEMA_DO_VIDEO]".

**Estilo Visual**: [EX: Animado, Realista, Minimalista, Cinematográfico]
**Tom**: [EX: Inspirador, Engraçado, Informativo, Promocional]
**Público-alvo**: [EX: Empreendedores, Jovens, Entusiastas de tecnologia]
**Elementos Chave**: [EX: Incluir uma pessoa sorrindo, mostrar um produto específico, texto na tela com "Dica Rápida"]
**Música de Fundo**: [EX: Otimista e motivacional, relaxante, energética]
**Chamada para Ação (CTA)**: [EX: "Visite nosso site", "Saiba mais no link da bio", "Deixe seu comentário"]
**Plataformas de Destino**: Instagram Reels, TikTok

**Exemplo de Prompt Preenchido:**

Crie um vídeo curto (até 60 segundos) para redes sociais com o seguinte tema: "5 Dicas Essenciais para Aumentar seu Engajamento no Instagram".

**Estilo Visual**: Animado, com gráficos informativos e transições rápidas.
**Tom**: Informativo e inspirador.
**Público-alvo**: Pequenos empreendedores e criadores de conteúdo.
**Elementos Chave**: Mostrar ícones de redes sociais, gráficos de crescimento, e um influenciador digital gesticulando.
**Música de Fundo**: Otimista e motivacional.
**Chamada para Ação (CTA)**: "Siga para mais dicas!"
**Plataformas de Destino**: Instagram Reels, TikTok
```

## Instruções para Implementação no Dashboard

1.  **Adicionar Opção de "Nova Automação de Vídeo"**: No menu "Automações", ao clicar em "+ Nova Automação", uma nova opção "Gerar Vídeo com IA" deve ser apresentada.
2.  **Formulário de Entrada de Prompt**: Ao selecionar a opção de vídeo, um formulário deve ser exibido com campos para o usuário preencher os detalhes do prompt (Tema, Estilo Visual, Tom, Público-alvo, Elementos Chave, Música de Fundo, CTA).
3.  **Integração com API da IA Flow**: O backend do sistema precisará ser configurado para se comunicar com a API da IA Flow (Google Flow/Veo). Isso exigirá chaves de API e credenciais adequadas.
4.  **Processamento Assíncrono**: A geração de vídeos pode levar tempo. O sistema deve processar a solicitação de forma assíncrona e notificar o usuário quando o vídeo estiver pronto.
5.  **Visualização e Aprovação**: Após a geração, o vídeo deve ser exibido em uma interface de pré-visualização, onde o usuário pode aprová-lo ou solicitar ajustes.
6.  **Conexão com Redes Sociais**: As contas de Instagram e TikTok devem estar previamente conectadas na seção "Configurações" para permitir a publicação automática. O sistema utilizará as APIs do Instagram Graph e TikTok For Developers para realizar as postagens.
7.  **Agendamento e Publicação**: Permitir que o usuário agende a publicação do vídeo ou o publique imediatamente nas plataformas selecionadas.

## Pré-requisitos Técnicos

Para que esta funcionalidade seja implementada, será necessário:

*   **Acesso à API da IA Flow (Google Flow/Veo)**: Obtenção de chaves de API e configuração de acesso.
*   **Configuração das APIs do Instagram e TikTok**: Conforme detalhado na seção "Configurações" do dashboard, é preciso configurar `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `TIKTOK_CLIENT_KEY` e `TIKTOK_CLIENT_SECRET` no ambiente de backend.
*   **Desenvolvimento de Backend**: Implementação da lógica para interagir com as APIs de geração de vídeo e de redes sociais.
*   **Desenvolvimento de Frontend**: Criação da interface de usuário para entrada de prompts e visualização de vídeos.

Com estas instruções, o usuário terá um guia claro para a implementação da funcionalidade de geração de vídeos com IA Flow no dashboard de automação.
