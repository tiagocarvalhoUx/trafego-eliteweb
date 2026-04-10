<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
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
  let showUploadForm = false;
  let runningCycle = false;
  let generatingVideo = false;
  let uploadingVideo = false;
  let publishingId: number | null = null;

  let uploadData = {
    file: null as File | null,
    caption: '',
    preview: '',
  };

  let publishCaption = '';
  let publishJobId: number | null = null;
  let publishPlatform: 'instagram' | 'tiktok' = 'instagram';

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

  let pollInterval: ReturnType<typeof setInterval> | null = null;

  function hasActiveJobs(): boolean {
    return videoJobs.some((j) => j.status === 'pending' || j.status === 'processing');
  }

  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(async () => {
      const prev = JSON.stringify(videoJobs.map((j) => j.status));
      videoJobs = await videoService.listJobs();
      const next = JSON.stringify(videoJobs.map((j) => j.status));
      if (next !== prev) {
        const justDone = videoJobs.filter((j) => j.status === 'done');
        if (justDone.length > 0) toast.success('Vídeo gerado com sucesso!');
      }
      if (!hasActiveJobs()) stopPolling();
    }, 5000);
  }

  function stopPolling() {
    if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
  }

  onMount(async () => {
    try {
      [automations, goals, accounts, videoJobs] = await Promise.all([
        automationService.getAutomations(),
        automationService.getGoals(),
        socialService.getAccounts(),
        videoService.listJobs(),
      ]);
      if (hasActiveJobs()) startPolling();
    } catch {
      toast.error('Erro ao carregar automações');
    } finally {
      loading = false;
    }
  });

  onDestroy(() => stopPolling());

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
      toast.success('Geração iniciada! O vídeo aparecerá aqui automaticamente.');
      startPolling();
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

  const MAX_FILE_MB = 45;

  function handleFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const sizeMB = file.size / 1024 / 1024;
    if (sizeMB > MAX_FILE_MB) {
      toast.error(`Vídeo muito grande (${sizeMB.toFixed(1)} MB). Limite: ${MAX_FILE_MB} MB. Comprima o vídeo antes de enviar.`);
      input.value = '';
      return;
    }
    uploadData.file = file;
    if (uploadData.preview) URL.revokeObjectURL(uploadData.preview);
    uploadData.preview = URL.createObjectURL(file);
  }

  async function handleUploadVideo() {
    if (!uploadData.file) {
      toast.error('Selecione um vídeo');
      return;
    }
    uploadingVideo = true;
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
      const backendUrl = 'https://trafego-eliteweb.onrender.com';

      // Step 1: get signed upload URL
      const signRes = await fetch(`${backendUrl}/api/video/upload/signed-url`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ filename: uploadData.file.name }),
      });
      if (!signRes.ok) {
        const e = await signRes.json().catch(() => ({}));
        throw new Error(e.message || `Erro ao obter URL (${signRes.status})`);
      }
      const { data: signData } = await signRes.json();

      // Step 2: upload directly to Supabase
      const contentType = uploadData.file.type || 'video/mp4';
      const putRes = await fetch(signData.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: uploadData.file,
      });
      if (!putRes.ok) {
        const body = await putRes.text().catch(() => '');
        console.error('[Upload] Supabase PUT failed:', putRes.status, body);
        throw new Error(`Supabase upload falhou (${putRes.status}): ${body.slice(0, 300)}`);
      }

      // Step 3: save to DB
      const completeRes = await fetch(`${backendUrl}/api/video/upload/complete`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ path: signData.path, caption: uploadData.caption }),
      });
      if (!completeRes.ok) {
        const e = await completeRes.json().catch(() => ({}));
        throw new Error(e.message || `Erro ao finalizar upload (${completeRes.status})`);
      }

      videoJobs = await videoService.listJobs();
      showUploadForm = false;
      if (uploadData.preview) URL.revokeObjectURL(uploadData.preview);
      uploadData = { file: null, caption: '', preview: '' };
      toast.success('Vídeo enviado com sucesso!');
    } catch (err: any) {
      toast.error(err?.message ?? 'Erro ao enviar vídeo');
    } finally {
      uploadingVideo = false;
    }
  }

  function openPublishModal(job: any, platform: 'instagram' | 'tiktok') {
    publishJobId = job.id;
    publishCaption = job.caption || '';
    publishPlatform = platform;
  }

  async function handlePublish() {
    if (!publishJobId) return;
    publishingId = publishJobId;
    try {
      if (publishPlatform === 'instagram') {
        await videoService.publishToInstagram(publishJobId, publishCaption);
      } else {
        await videoService.publishToTikTok(publishJobId, publishCaption);
      }
      videoJobs = await videoService.listJobs();
      publishJobId = null;
      publishCaption = '';
      toast.success(`Publicado no ${publishPlatform === 'instagram' ? 'Instagram' : 'TikTok'} com sucesso!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? err?.message ?? 'Erro ao publicar');
    } finally {
      publishingId = null;
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
      <div class="card mb-4 border-emerald-500/30">
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
        <p class="text-gray-500 text-xs mt-0.5">Powered by Pixverse AI + ElevenLabs</p>
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
        <h3 class="text-base font-semibold text-white mb-1">Gerar Vídeo com IA</h3>
        <p class="text-xs text-gray-400 mb-4">Vídeo de 8s com narração em voz gerado automaticamente</p>
        <form on:submit|preventDefault={handleCreateVideo} class="flex flex-col gap-4">
          <div>
            <label class="block text-sm text-gray-300 mb-1.5">
              Sobre o que é o vídeo? <span class="text-red-400">*</span>
            </label>
            <textarea
              bind:value={newVideo.tema}
              class="input resize-none"
              rows="3"
              placeholder='Ex: "5 dicas para aumentar seguidores no Instagram usando Reels"'
              required
            ></textarea>
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">Chamada para ação (CTA) <span class="text-gray-500 text-xs">— opcional</span></label>
            <input
              bind:value={newVideo.cta}
              class="input"
              placeholder='Ex: "Siga para mais dicas!", "Link na bio"'
            />
          </div>

          <div>
            <label class="block text-sm text-gray-300 mb-2">Plataforma</label>
            <div class="flex flex-wrap gap-2">
              {#each ['Instagram Reels', 'TikTok', 'YouTube Shorts', 'Facebook'] as p}
                <button
                  type="button"
                  on:click={() => { newVideo.plataformas = newVideo.plataformas === p ? '' : p; }}
                  class="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors
                    {newVideo.plataformas === p
                      ? 'bg-purple-600 border-purple-500 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-purple-500/50'}"
                >
                  {p}
                </button>
              {/each}
            </div>
          </div>

          <div class="flex gap-3 pt-1">
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
          <div class="card overflow-hidden">
            <div class="flex items-start gap-4">
              <!-- Icon / mini thumbnail -->
              <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-2xl shrink-0 relative">
                🎬
                {#if job.status === 'pending' || job.status === 'processing'}
                  <span class="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-ping"></span>
                {/if}
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

              <div class="flex gap-2 shrink-0 flex-wrap">
                {#if job.status === 'done' && job.video_url}
                  <a href={job.video_url} target="_blank" rel="noopener" class="btn-secondary text-xs py-1.5 px-3">
                    ↗ Abrir
                  </a>
                  {#if !job.publicado_instagram}
                    <button
                      on:click={() => openPublishModal(job, 'instagram')}
                      disabled={publishingId === job.id}
                      class="text-xs px-3 py-1.5 rounded-lg border border-purple-500/30 text-purple-400 hover:bg-purple-500/10 transition-colors"
                    >
                      Instagram
                    </button>
                  {:else}
                    <span class="text-xs px-3 py-1.5 text-green-400">IG</span>
                  {/if}
                  {#if !job.publicado_tiktok}
                    <button
                      on:click={() => openPublishModal(job, 'tiktok')}
                      disabled={publishingId === job.id}
                      class="text-xs px-3 py-1.5 rounded-lg border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    >
                      TikTok
                    </button>
                  {:else}
                    <span class="text-xs px-3 py-1.5 text-green-400">TT</span>
                  {/if}
                {/if}
                <button
                  on:click={() => handleDeleteVideo(job.id)}
                  class="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Remover
                </button>
              </div>
            </div>

            <!-- Progress bar while generating -->
            {#if job.status === 'pending' || job.status === 'processing'}
              <div class="mt-4">
                <div class="flex items-center gap-2 mb-2">
                  <div class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <p class="text-blue-300 text-xs">Gerando vídeo com IA... isso pode levar alguns minutos</p>
                </div>
                <div class="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div class="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full animate-[shimmer_2s_linear_infinite] bg-[length:200%_100%]"></div>
                </div>
              </div>
            {/if}

            <!-- Inline video player when done -->
            {#if job.status === 'done' && job.video_url}
              <div class="mt-4">
                <video
                  src={job.video_url}
                  controls
                  class="w-full max-h-96 rounded-xl bg-black object-contain"
                  preload="metadata"
                >
                  <track kind="captions" />
                </video>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Upload Video Section -->
  <div class="mb-8">
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-lg font-semibold text-white">Upload de Video</h2>
        <p class="text-gray-500 text-xs mt-0.5">Envie seu video e publique no Instagram ou TikTok</p>
      </div>
      <button on:click={() => (showUploadForm = !showUploadForm)} class="btn-primary text-sm">
        + Upload de Video
      </button>
    </div>

    {#if showUploadForm}
      <div class="card mb-4 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-cyan-500/5">
        <h3 class="text-base font-semibold text-white mb-4">Enviar Video</h3>
        <form on:submit|preventDefault={handleUploadVideo} class="flex flex-col gap-4">
          <div>
            <label class="block text-sm text-gray-300 mb-1.5">
              Video <span class="text-red-400">*</span>
            </label>
            <label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-blue-500/50 transition-colors {uploadData.file ? 'border-blue-500/30 bg-blue-500/5' : ''}">
              {#if uploadData.file}
                <p class="text-blue-300 text-sm font-medium">{uploadData.file.name}</p>
                <p class="text-gray-500 text-xs mt-1">{(uploadData.file.size / 1024 / 1024).toFixed(1)} MB</p>
              {:else}
                <p class="text-gray-400 text-sm">Clique para selecionar ou arraste o video</p>
                <p class="text-gray-600 text-xs mt-1">MP4, MOV (max 45MB)</p>
              {/if}
              <input type="file" accept="video/mp4,video/quicktime,video/*" class="hidden" on:change={handleFileSelect} />
            </label>
          </div>

          {#if uploadData.preview}
            <video src={uploadData.preview} controls class="w-full max-h-64 rounded-xl bg-black object-contain" preload="metadata">
              <track kind="captions" />
            </video>
          {/if}

          <div>
            <label class="block text-sm text-gray-300 mb-1.5">
              Texto do post (caption)
            </label>
            <textarea
              bind:value={uploadData.caption}
              class="input resize-none"
              rows="3"
              placeholder="Escreva o texto que vai aparecer no post... Inclua hashtags!"
            ></textarea>
            <p class="text-gray-600 text-xs mt-1">{uploadData.caption.length}/2200 caracteres</p>
          </div>

          <div class="flex gap-3 pt-1">
            <button type="submit" disabled={uploadingVideo || !uploadData.file} class="btn-primary">
              {uploadingVideo ? 'Enviando...' : 'Enviar Video'}
            </button>
            <button type="button" on:click={() => { showUploadForm = false; if (uploadData.preview) URL.revokeObjectURL(uploadData.preview); uploadData = { file: null, caption: '', preview: '' }; }} class="btn-secondary">Cancelar</button>
          </div>
        </form>
      </div>
    {/if}
  </div>

  <!-- Publish Modal -->
  {#if publishJobId}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" on:click|self={() => { publishJobId = null; }} on:keydown={(e) => { if (e.key === 'Escape') publishJobId = null; }}>
      <div class="card w-full max-w-lg mx-4 border-purple-500/30">
        <h3 class="text-base font-semibold text-white mb-4">
          Publicar no {publishPlatform === 'instagram' ? 'Instagram' : 'TikTok'}
        </h3>
        <div>
          <label class="block text-sm text-gray-300 mb-1.5">Texto do post</label>
          <textarea
            bind:value={publishCaption}
            class="input resize-none"
            rows="4"
            placeholder="Escreva o texto do post com hashtags..."
          ></textarea>
          <p class="text-gray-600 text-xs mt-1">{publishCaption.length}/{publishPlatform === 'tiktok' ? '150' : '2200'} caracteres</p>
        </div>
        <div class="flex gap-3 mt-4">
          <button on:click={handlePublish} disabled={publishingId !== null} class="btn-primary">
            {publishingId ? 'Publicando...' : `Publicar no ${publishPlatform === 'instagram' ? 'Instagram' : 'TikTok'}`}
          </button>
          <button on:click={() => { publishJobId = null; }} class="btn-secondary">Cancelar</button>
        </div>
      </div>
    </div>
  {/if}

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
                  class="h-full rounded-full transition-all duration-500 {goal.concluida ? 'bg-green-500' : 'bg-emerald-500'}"
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
