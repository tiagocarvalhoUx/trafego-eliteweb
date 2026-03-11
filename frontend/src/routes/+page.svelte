<script lang="ts">
  import { onMount } from 'svelte';
  import { analyticsService } from '$lib/services/analyticsService';
  import { authStore } from '$lib/stores/auth';
  import StatCard from '$lib/components/StatCard.svelte';
  import Chart from '$lib/components/Chart.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import PageHeader from '$lib/components/PageHeader.svelte';

  let summary: any = null;
  let engagementData: any[] = [];
  let followerData: any[] = [];
  let topPosts: any[] = [];
  let loading = true;

  onMount(async () => {
    try {
      [summary, engagementData, followerData, topPosts] = await Promise.all([
        analyticsService.getDashboard(),
        analyticsService.getEngagement(30),
        analyticsService.getFollowers(30),
        analyticsService.getTopPosts(5),
      ]);
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });

  $: engagementSeries = [
    { name: 'Curtidas', data: engagementData.map((d: any) => d.total_curtidas || 0) },
    { name: 'Comentários', data: engagementData.map((d: any) => d.total_comentarios || 0) },
    { name: 'Compartilhamentos', data: engagementData.map((d: any) => d.total_compartilhamentos || 0) },
  ];
  $: engagementCategories = engagementData.map((d: any) =>
    new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  );

  $: followerSeries = [{ name: 'Seguidores', data: followerData.map((d: any) => d.total || 0) }];
  $: followerCategories = followerData.map((d: any) =>
    new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
  );

  function formatNumber(n: number): string {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }
</script>

<svelte:head>
  <title>Dashboard - Social Analytics</title>
</svelte:head>

<PageHeader
  title="Dashboard"
  subtitle="Bem-vindo de volta, {$authStore.user?.nome ?? ''}! Aqui está o resumo das suas redes sociais."
/>

{#if loading}
  <div class="flex justify-center py-20">
    <LoadingSpinner size="lg" />
  </div>
{:else}
  <!-- Stats Grid -->
  <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
    <StatCard
      title="Total de Seguidores"
      value={formatNumber(summary?.totalSeguidores ?? 0)}
      subtitle="Todas as contas conectadas"
      icon="👥"
      color="blue"
    />
    <StatCard
      title="Taxa de Engajamento"
      value="{summary?.taxaEngajamento ?? '0.00'}%"
      subtitle="Últimos 30 dias"
      icon="📈"
      color="green"
    />
    <StatCard
      title="Total de Leads"
      value={formatNumber(summary?.totalLeads ?? 0)}
      subtitle="Capturados automaticamente"
      icon="🎯"
      color="purple"
    />
    <StatCard
      title="Crescimento Semanal"
      value="{summary?.crescimentoSemanal >= 0 ? '+' : ''}{formatNumber(summary?.crescimentoSemanal ?? 0)}"
      subtitle="Novos seguidores esta semana"
      icon="🚀"
      color="orange"
    />
  </div>

  <!-- Charts Row -->
  <div class="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
    <div class="card">
      <h3 class="text-base font-semibold text-white mb-4">Engajamento - Últimos 30 dias</h3>
      {#if engagementSeries[0].data.length > 0}
        <Chart type="area" series={engagementSeries} categories={engagementCategories} height={250} />
      {:else}
        <div class="flex items-center justify-center h-64 text-gray-500 text-sm">
          Nenhum dado disponível. Conecte uma conta social.
        </div>
      {/if}
    </div>

    <div class="card">
      <h3 class="text-base font-semibold text-white mb-4">Crescimento de Seguidores</h3>
      {#if followerSeries[0].data.length > 0}
        <Chart type="area" series={followerSeries} categories={followerCategories} height={250} colors={['#8b5cf6']} />
      {:else}
        <div class="flex items-center justify-center h-64 text-gray-500 text-sm">
          Nenhum dado disponível. Conecte uma conta social.
        </div>
      {/if}
    </div>
  </div>

  <!-- Top Posts -->
  <div class="card">
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-semibold text-white">Top Posts por Engajamento</h3>
      <a href="/analytics" class="text-sm text-primary-400 hover:text-primary-300">Ver todos →</a>
    </div>

    {#if topPosts.length === 0}
      <p class="text-gray-500 text-sm text-center py-8">Nenhum post encontrado ainda.</p>
    {:else}
      <div class="space-y-3">
        {#each topPosts as post, i}
          <div class="flex items-center gap-4 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
            <span class="text-gray-500 font-bold w-6 text-sm">#{i + 1}</span>
            <div class="flex-1 min-w-0">
              <p class="text-white text-sm truncate">
                {post.legenda?.substring(0, 80) ?? 'Sem legenda'}...
              </p>
              <p class="text-gray-500 text-xs mt-0.5">{post.plataforma}</p>
            </div>
            <div class="flex gap-4 text-sm text-right shrink-0">
              <div>
                <p class="text-white font-medium">{formatNumber(post.curtidas ?? 0)}</p>
                <p class="text-gray-500 text-xs">Curtidas</p>
              </div>
              <div>
                <p class="text-green-400 font-medium">{post.taxa_engajamento ?? '0.00'}%</p>
                <p class="text-gray-500 text-xs">Eng.</p>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}
