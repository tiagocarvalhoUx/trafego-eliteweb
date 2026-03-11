<script lang="ts">
  import { onMount } from 'svelte';
  import { automationService } from '$lib/services/automationService';
  import { socialService } from '$lib/services/socialService';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { toast } from '$lib/stores/notifications';

  let automations: any[] = [];
  let goals: any[] = [];
  let accounts: any[] = [];
  let loading = true;
  let showCreateForm = false;
  let showGoalForm = false;
  let runningCycle = false;

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
      [automations, goals, accounts] = await Promise.all([
        automationService.getAutomations(),
        automationService.getGoals(),
        socialService.getAccounts(),
      ]);
    } catch {
      toast.error('Erro ao carregar automações');
    } finally {
      loading = false;
    }
  });

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
