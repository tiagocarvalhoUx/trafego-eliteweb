<script lang="ts">
  import { onMount } from 'svelte';
  import { automationService } from '$lib/services/automationService';
  import { socialService } from '$lib/services/socialService';
  import { videoService } from '$lib/services/videoService';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { toast } from '$lib/stores/notifications';

  let automations: any[] = [];
  let goals: any[] = [];
  let accounts: any[] = [];
  let videoJobs: any[] = [];
  let loading = true;
  let showCreateForm = false;
  let showGoalForm = false;
  let showVideoForm = false;
  let runningCycle = false;
  let generatingVideo = false;

  let newVideo = {
    tema: '',
    estilo: '',
    tom: '',
    publico: '',
    elementos: '',
    musica: '',
    cta: '',
    plataformas: 'Instagram Reels, TikTok',
  };

  let newAutomation = {
    conta_id: '',
    nome: '',
    tipo: 'comentario_keyword',
    palavra_chave: '',
    mensagem_resposta: '',
  };

  let newGoal = {
    conta_id: '',
    tipo: 'seguidores',
    valor_meta: '',
    periodo: 'mensal',
    data_inicio: '',
    data_fim: '',
  };

  onMount(async () => {
    try {
      [automations, goals, accounts, videoJobs] = await Promise.all([
        automationService.getAutomations(),
        automationService.getGoals(),
        socialService.getAccounts(),
        videoService.listJobs(),
      ]);
    } catch {
      toast.error('Erro ao carregar automações');
    } finally {
      loading = false;
    }
  });

  async function handleCreateVideo() {
    if (!newVideo.tema.trim()) {
      toast.error('O tema do vídeo é obrigatório');
      return;
    }
    generatingVideo = true;
    try {
      await videoService.createJob(newVideo);
      videoJobs = await videoService.listJobs();
      showVideoForm = false;
      newVideo = { tema: '', estilo: '', tom: '', publico: '', elementos: '', musica: '', cta: '', plataformas: 'Instagram Reels, TikTok' };
      toast.success('Geração de vídeo iniciada! Atualize a página em alguns minutos.');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao iniciar geração de vídeo');
    } finally {
      generatingVideo = false;
    }
  }

  async function handleRefreshJobs() {
    videoJobs = await videoService.listJobs();
  }

  async function handleDeleteVideo(id: number) {
    if (!confirm('Remover este vídeo?')) return;
    try {
      await videoService.deleteJob(id);
      videoJobs = videoJobs.filter((v) => v.id !== id);
      toast.success('Vídeo removido');
    } catch {
      toast.error('Erro ao remover vídeo');
    }
  }

  function statusLabel(status: string): string {
    return { pending: 'Aguardando', processing: 'Gerando...', done: 'Pronto', failed: 'Falhou' }[status] ?? status;
  }

  function statusColor(status: string): string {
    return { pending: 'badge-gray', processing: 'badge-blue', done: 'badge-green', failed: 'badge-red' }[status] ?? 'badge-gray';
  }

  async function handleCreateAutomation() {
    try {
      await automationService.createAutomation(newAutomation);
      automations = await automationService.getAutomations();
      showCreateForm = false;
      newAutomation = { conta_id: '', nome: '', tipo: 'comentario_keyword', palavra_chave: '', mensagem_resposta: '' };
      toast.success('Automação criada com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar automação');
    }
  }

  async function handleToggle(id: number) {
    try {
      const result = await automationService.toggleAutomation(id);
      const a = automations.find((x) => x.id === id);
      if (a) a.ativo = result.data.ativo;
      automations = [...automations];
    } catch {
      toast.error('Erro ao atualizar automação');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Remover esta automação?')) return;
    try {
      await automationService.deleteAutomation(id);
      automations = automations.filter((a) => a.id !== id);
      toast.success('Automação removida');
    } catch {
      toast.error('Erro ao remover automação');
    }
  }

  async function handleRunCycle() {
    runningCycle = true;
    try {
      await automationService.runCycle();
      toast.success('Ciclo executado! Verifique os leads em instantes.');
    } catch {
      toast.error('Erro ao executar ciclo');
    } finally {
      runningCycle = false;
    }
  }

  async function handleCreateGoal() {
    try {
      await automationService.createGoal(newGoal);
      goals = await automationService.getGoals();
      showGoalForm = false;
      toast.success('Meta criada com sucesso!');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao criar meta');
    }
  }

  function getGoalProgress(goal: any): number {
    return Math.min(100, Math.round((goal.valor_atual / goal.valor_meta) * 100));
  }
</script>

<svelte:head>
  <title>Automações - Social Analytics</title>
</svelte:head>

<PageHeader title="Automações" subtitle="Configure automações de comentários e metas de crescimento" />

{#if loading}
  <div class="flex justify-center py-20">
    <LoadingSpinner size="lg" />
  </div>
{:else}
  <!-- Automations Section -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-white">Automações por Palavra-Chave</h2>
      <div class="flex gap-2">
        <button on:click={handleRunCycle} disabled={runningCycle} class="btn-secondary text-sm">
          {runningCycle ? 'Executando...' : '▶ Executar agora'}
        </button>
        <button on:click={() => (showCreateForm = !showCreateForm)} class="btn-primary text-sm">
          + Nova Automação
        </button>
      </div>
    </div>

    <!-- Create Form -->
    {#if showCreateForm}
      <div class="card mb-4 border-primary-500/30">
        <h3 class="text-base font-semibold text-white mb-4">Nova Automação</h3>
        <form on:submit|preventDefault={handleCreateAutomation} class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Conta</label>
            <select bind:value={newAutomation.conta_id} class="input" required>
              <option value="">Selecione uma conta</option>
              {#each accounts.filter(a => a.ativo) as account}
                <option value={account.id}>{account.plataforma} - @{account.conta_nome}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Nome da automação</label>
            <input bind:value={newAutomation.nome} class="input" placeholder="Ex: Envio de guia" required />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Palavra-chave</label>
            <input bind:value={newAutomation.palavra_chave} class="input" placeholder='Ex: GUIA, INFO, QUERO' />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm text-gray-300 mb-1.5">Mensagem automática (DM)</label>
            <textarea
              bind:value={newAutomation.mensagem_resposta}
              class="input h-20 resize-none"
              placeholder="Olá! Aqui está o link que você pediu: ..."
            ></textarea>
          </div>

          <div class="md:col-span-2 flex gap-3">
            <button type="submit" class="btn-primary">Criar Automação</button>
            <button type="button" on:click={() => (showCreateForm = false)} class="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    {/if}

    <!-- Automations List -->
    {#if automations.length === 0}
      <div class="card text-center py-12">
        <p class="text-gray-400 text-4xl mb-3">⚡</p>
        <p class="text-gray-400">Nenhuma automação configurada</p>
        <p class="text-gray-500 text-sm mt-1">Crie uma automação para capturar leads automaticamente</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each automations as auto}
          <div class="card flex items-center gap-4">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <p class="text-white font-medium">{auto.nome}</p>
                <span class="badge {auto.ativo ? 'badge-green' : 'badge-gray'}">
                  {auto.ativo ? 'Ativa' : 'Inativa'}
                </span>
              </div>
              <p class="text-gray-400 text-sm">
                {auto.plataforma} · @{auto.conta_nome}
                {#if auto.palavra_chave} · Keyword: <strong class="text-white">"{auto.palavra_chave}"</strong>{/if}
              </p>
              <p class="text-gray-500 text-xs mt-1">{auto.total_disparos} disparos realizados</p>
            </div>

            <div class="flex items-center gap-2 shrink-0">
              <button
                on:click={() => handleToggle(auto.id)}
                class="text-sm px-3 py-1.5 rounded-lg border transition-colors
                  {auto.ativo
                    ? 'border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10'
                    : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}"
              >
                {auto.ativo ? 'Desativar' : 'Ativar'}
              </button>
              <button
                on:click={() => handleDelete(auto.id)}
                class="text-sm px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Remover
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- AI Video Section -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold text-white">Gerar Vídeo com IA</h2>
        <p class="text-gray-500 text-xs mt-0.5">Powered by Google Veo 2</p>
      </div>
      <div class="flex gap-2">
        <button on:click={handleRefreshJobs} class="btn-secondary text-sm">↻ Atualizar</button>
        <button on:click={() => (showVideoForm = !showVideoForm)} class="btn-primary text-sm">
          + Gerar Vídeo com IA
        </button>
      </div>
    </div>

    {#if showVideoForm}
      <div class="card mb-4 border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-pink-500/5">
        <h3 class="text-base font-semibold text-white mb-4">Nova Automação de Vídeo</h3>
        <form on:submit|preventDefault={handleCreateVideo} class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2">
            <label class="block text-sm text-gray-300 mb-1.5">Tema do vídeo <span class="text-red-400">*</span></label>
            <input
              bind:value={newVideo.tema}
              class="input"
              placeholder='Ex: "5 Dicas para Aumentar Engajamento no Instagram"'
              required
            />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Estilo Visual</label>
            <input bind:value={newVideo.estilo} class="input" placeholder="Ex: Animado, Realista, Minimalista" />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Tom</label>
            <input bind:value={newVideo.tom} class="input" placeholder="Ex: Inspirador, Informativo, Promocional" />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Público-alvo</label>
            <input bind:value={newVideo.publico} class="input" placeholder="Ex: Empreendedores, Jovens de 18-25 anos" />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Música de Fundo</label>
            <input bind:value={newVideo.musica} class="input" placeholder="Ex: Otimista e motivacional, Energética" />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm text-gray-300 mb-1.5">Elementos Chave</label>
            <input bind:value={newVideo.elementos} class="input" placeholder="Ex: Ícones de redes sociais, gráficos de crescimento, pessoa sorrindo" />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Chamada para Ação (CTA)</label>
            <input bind:value={newVideo.cta} class="input" placeholder='Ex: "Siga para mais dicas!", "Link na bio"' />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Plataformas</label>
            <input bind:value={newVideo.plataformas} class="input" placeholder="Instagram Reels, TikTok" />
          </div>

          <div class="md:col-span-2 flex gap-3">
            <button type="submit" disabled={generatingVideo} class="btn-primary">
              {generatingVideo ? 'Iniciando...' : '✨ Gerar Vídeo'}
            </button>
            <button type="button" on:click={() => (showVideoForm = false)} class="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    {/if}

    {#if videoJobs.length === 0}
      <div class="card text-center py-12">
        <p class="text-gray-400 text-4xl mb-3">🎬</p>
        <p class="text-gray-400">Nenhum vídeo gerado ainda</p>
        <p class="text-gray-500 text-sm mt-1">Clique em "+ Gerar Vídeo com IA" para criar seu primeiro vídeo</p>
      </div>
    {:else}
      <div class="space-y-3">
        {#each videoJobs as job}
          <div class="card">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-2xl shrink-0">
                🎬
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                  <p class="text-white font-medium truncate">{job.prompt_tema}</p>
                  <span class="badge {statusColor(job.status)}">{statusLabel(job.status)}</span>
                </div>
                <p class="text-gray-500 text-xs">
                  {job.prompt_estilo ? `Estilo: ${job.prompt_estilo} · ` : ''}
                  {job.plataformas ?? ''}
                </p>
                <p class="text-gray-600 text-xs mt-1">{new Date(job.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</p>
                {#if job.status === 'failed' && job.error_msg}
                  <p class="text-red-400 text-xs mt-1">Erro: {job.error_msg}</p>
                {/if}
              </div>
              <div class="flex gap-2 shrink-0">
                {#if job.status === 'done' && job.video_url}
                  <a href={job.video_url} target="_blank" rel="noopener" class="btn-secondary text-xs py-1.5 px-3">
                    ▶ Ver vídeo
                  </a>
                {/if}
                <button
                  on:click={() => handleDeleteVideo(job.id)}
                  class="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Goals Section -->
  <div>
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-white">Metas de Crescimento</h2>
      <button on:click={() => (showGoalForm = !showGoalForm)} class="btn-secondary text-sm">
        + Nova Meta
      </button>
    </div>

    {#if showGoalForm}
      <div class="card mb-4 border-purple-500/30">
        <h3 class="text-base font-semibold text-white mb-4">Nova Meta</h3>
        <form on:submit|preventDefault={handleCreateGoal} class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Conta</label>
            <select bind:value={newGoal.conta_id} class="input" required>
              <option value="">Selecione uma conta</option>
              {#each accounts.filter(a => a.ativo) as account}
                <option value={account.id}>{account.plataforma} - @{account.conta_nome}</option>
              {/each}
            </select>
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Tipo de meta</label>
            <select bind:value={newGoal.tipo} class="input">
              <option value="seguidores">Seguidores</option>
              <option value="engajamento">Engajamento</option>
              <option value="leads">Leads</option>
            </select>
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Valor alvo</label>
            <input type="number" bind:value={newGoal.valor_meta} class="input" placeholder="Ex: 10000" required />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Período</label>
            <select bind:value={newGoal.periodo} class="input">
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Data início</label>
            <input type="date" bind:value={newGoal.data_inicio} class="input" required />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Data fim</label>
            <input type="date" bind:value={newGoal.data_fim} class="input" required />
          </div>

          <div class="md:col-span-2 flex gap-3">
            <button type="submit" class="btn-primary">Criar Meta</button>
            <button type="button" on:click={() => (showGoalForm = false)} class="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    {/if}

    {#if goals.length === 0}
      <div class="card text-center py-12">
        <p class="text-gray-400 text-4xl mb-3">🎯</p>
        <p class="text-gray-400">Nenhuma meta configurada</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {#each goals as goal}
          {@const progress = getGoalProgress(goal)}
          <div class="card">
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-white font-medium capitalize">{goal.tipo}</p>
                <p class="text-gray-500 text-xs">{goal.plataforma} · @{goal.conta_nome} · {goal.periodo}</p>
              </div>
              {#if goal.concluida}
                <span class="badge badge-green">Concluída ✓</span>
              {:else}
                <span class="badge badge-blue">{progress}%</span>
              {/if}
            </div>

            <div class="mb-2">
              <div class="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500 {goal.concluida ? 'bg-green-500' : 'bg-primary-500'}"
                  style="width: {progress}%"
                ></div>
              </div>
            </div>

            <p class="text-gray-400 text-sm">
              {goal.valor_atual.toLocaleString('pt-BR')} / {goal.valor_meta.toLocaleString('pt-BR')}
            </p>
            <p class="text-gray-600 text-xs mt-1">{goal.data_inicio} → {goal.data_fim}</p>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
