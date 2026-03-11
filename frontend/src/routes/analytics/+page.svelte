<script lang="ts">
  import { onMount } from 'svelte';
  import { analyticsService } from '$lib/services/analyticsService';
  import Chart from '$lib/components/Chart.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import { toast } from '$lib/stores/notifications';

  let period = 30;
  let loading = true;
  let engagementData: any[] = [];
  let followerData: any[] = [];
  let topPosts: any[] = [];
  let viralPosts: any[] = [];
  let bestTimes: any[] = [];
  let exportingPDF = false;
  let exportingCSV = false;

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

  async function loadData() {
    loading = true;
    try {
      [engagementData, followerData, topPosts, viralPosts, bestTimes] = await Promise.all([
        analyticsService.getEngagement(period),
        analyticsService.getFollowers(period),
        analyticsService.getTopPosts(10),
        analyticsService.getViralPosts(),
        analyticsService.getBestTimes(),
      ]);
    } catch {
      toast.error('Erro ao carregar analytics');
    } finally {
      loading = false;
    }
  }

  onMount(loadData);

  $: engagementSeries = [
    { name: 'Curtidas', data: engagementData.map((d: any) => d.total_curtidas || 0) },
    { name: 'Comentários', data: engagementData.map((d: any) => d.total_comentarios || 0) },
    { name: 'Visualizações', data: engagementData.map((d: any) => d.total_visualizacoes || 0) },
  ];
  $: engagementCategories = engagementData.map((d: any) =>
    new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  );
  $: followerSeries = [{ name: 'Seguidores', data: followerData.map((d: any) => d.total || 0) }];
  $: followerCategories = followerData.map((d: any) =>
    new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  );

  async function handleExportPDF() {
    exportingPDF = true;
    try {
      await analyticsService.exportPDF();
      toast.success('PDF gerado com sucesso!');
    } catch {
      toast.error('Erro ao gerar PDF');
    } finally {
      exportingPDF = false;
    }
  }

  async function handleExportCSV() {
    exportingCSV = true;
    try {
      await analyticsService.exportEngagementCSV();
      toast.success('CSV exportado com sucesso!');
    } catch {
      toast.error('Erro ao exportar CSV');
    } finally {
      exportingCSV = false;
    }
  }
</script>

<svelte:head>
  <title>Analytics - Social Analytics</title>
</svelte:head>

<div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
  <PageHeader title="Analytics" subtitle="Métricas detalhadas de engajamento e crescimento" />

  <div class="flex items-center gap-2 flex-wrap shrink-0">
    <select bind:value={period} on:change={loadData} class="input w-auto text-sm">
      <option value={7}>7 dias</option>
      <option value={14}>14 dias</option>
      <option value={30}>30 dias</option>
      <option value={90}>90 dias</option>
    </select>
    <button on:click={handleExportCSV} disabled={exportingCSV} class="btn-secondary text-sm">
      {exportingCSV ? 'Exportando...' : '📥 CSV'}
    </button>
    <button on:click={handleExportPDF} disabled={exportingPDF} class="btn-secondary text-sm">
      {exportingPDF ? 'Gerando...' : '📄 PDF'}
    </button>
  </div>
</div>

{#if loading}
  <div class="flex justify-center py-20">
    <LoadingSpinner size="lg" />
  </div>
{:else}
  <!-- Engagement Chart -->
  <div class="card mb-6">
    <h3 class="text-base font-semibold text-white mb-4">Engajamento por Dia</h3>
    {#if engagementSeries[0].data.length > 0}
      <Chart type="bar" series={engagementSeries} categories={engagementCategories} height={280} />
    {:else}
      <p class="text-center text-gray-500 py-16 text-sm">Sem dados para o período selecionado</p>
    {/if}
  </div>

  <!-- Follower Growth -->
  <div class="card mb-6">
    <h3 class="text-base font-semibold text-white mb-4">Crescimento de Seguidores</h3>
    {#if followerSeries[0].data.length > 0}
      <Chart type="area" series={followerSeries} categories={followerCategories} height={250} colors={['#10b981']} />
    {:else}
      <p class="text-center text-gray-500 py-16 text-sm">Sem dados para o período selecionado</p>
    {/if}
  </div>

  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
    <!-- Top Posts Table -->
    <div class="card">
      <h3 class="text-base font-semibold text-white mb-4">Top Posts</h3>
      {#if topPosts.length === 0}
        <p class="text-gray-500 text-sm text-center py-8">Nenhum post encontrado</p>
      {:else}
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-gray-400 border-b border-gray-800">
                <th class="text-left pb-3 font-medium">Post</th>
                <th class="text-right pb-3 font-medium">Curtidas</th>
                <th class="text-right pb-3 font-medium">Taxa</th>
              </tr>
            </thead>
            <tbody class="space-y-2">
              {#each topPosts as post}
                <tr class="border-b border-gray-800/50">
                  <td class="py-2.5 pr-4">
                    <p class="text-white truncate max-w-[180px]">{post.legenda?.substring(0, 40) ?? 'Sem legenda'}...</p>
                    <p class="text-gray-500 text-xs">{post.plataforma}</p>
                  </td>
                  <td class="py-2.5 text-right text-gray-300">{post.curtidas ?? 0}</td>
                  <td class="py-2.5 text-right font-medium text-green-400">{post.taxa_engajamento ?? '0'}%</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>

    <!-- Best Posting Times -->
    <div class="card">
      <h3 class="text-base font-semibold text-white mb-4">Melhores Horários para Postar</h3>
      {#if bestTimes.length === 0}
        <p class="text-gray-500 text-sm text-center py-8">Dados insuficientes. Continue postando!</p>
      {:else}
        <div class="space-y-3">
          {#each bestTimes as time, i}
            <div class="flex items-center gap-3">
              <span class="text-gray-500 w-4 text-sm">#{i + 1}</span>
              <div class="flex-1 bg-gray-800 rounded-lg px-3 py-2 flex items-center justify-between">
                <span class="text-white text-sm font-medium">
                  {diasSemana[time.dia_semana - 1]} às {String(time.hora).padStart(2, '0')}:00
                </span>
                <span class="text-green-400 text-sm font-medium">
                  {parseFloat(time.media_engajamento).toFixed(2)}%
                </span>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>

  <!-- Viral Posts -->
  {#if viralPosts.length > 0}
    <div class="card border-yellow-500/30">
      <div class="flex items-center gap-2 mb-4">
        <span class="text-xl">🔥</span>
        <h3 class="text-base font-semibold text-white">Posts com Potencial Viral</h3>
      </div>
      <div class="space-y-2">
        {#each viralPosts as post}
          <div class="flex items-center gap-3 p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg">
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm truncate">{post.legenda?.substring(0, 80) ?? 'Sem legenda'}...</p>
              <p class="text-gray-500 text-xs">{post.plataforma}</p>
            </div>
            <span class="text-yellow-400 font-bold text-sm shrink-0">{post.taxa_engajamento}% eng.</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}
{/if}
