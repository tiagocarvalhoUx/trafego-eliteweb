<script lang="ts">
  import api from '$lib/services/api';

  let loading = false;
  let result: any = null;
  let error = '';
  let activeAction = '';

  async function testComments() {
    loading = true;
    activeAction = 'comments';
    error = '';
    result = null;
    try {
      const { data } = await api.get('/automation/debug-comments');
      result = data;
    } catch (err: any) {
      error = err.response?.data?.error || err.message || 'Erro desconhecido';
    } finally {
      loading = false;
    }
  }

  async function debugCycle() {
    loading = true;
    activeAction = 'cycle';
    error = '';
    result = null;
    try {
      const { data } = await api.post('/automation/debug-cycle', {}, { timeout: 120000 });
      result = data;
    } catch (err: any) {
      error = err.response?.data?.error || err.message || 'Erro desconhecido';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Debug - Instagram API</title>
</svelte:head>

<div class="max-w-4xl mx-auto py-8 px-4">
  <h1 class="text-2xl font-bold text-white mb-6">Debug Instagram API</h1>

  <div class="flex gap-4 mb-6">
    <button
      on:click={testComments}
      disabled={loading}
      class="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
    >
      {loading && activeAction === 'comments' ? 'Carregando...' : 'Testar Comentarios'}
    </button>

    <button
      on:click={debugCycle}
      disabled={loading}
      class="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
    >
      {loading && activeAction === 'cycle' ? 'Processando... (pode demorar)' : 'Debug Ciclo Automacao'}
    </button>
  </div>

  {#if error}
    <div class="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-4">
      <p class="text-red-300 font-semibold">Erro:</p>
      <pre class="text-red-200 text-sm mt-2 whitespace-pre-wrap">{error}</pre>
    </div>
  {/if}

  {#if result}
    {#if result.logs}
      <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-4">
        <p class="text-blue-400 font-semibold mb-2">Logs do Ciclo:</p>
        {#each result.logs as logLine}
          <p class="text-gray-300 text-sm font-mono {logLine.includes('MATCH') ? 'text-green-400 font-bold' : ''} {logLine.includes('Lead created') ? 'text-yellow-400 font-bold' : ''} {logLine.includes('error') || logLine.includes('failed') ? 'text-red-400' : ''}">
            {logLine}
          </p>
        {/each}
      </div>
      {#if result.leads_created !== undefined}
        <div class="bg-{result.leads_created > 0 ? 'green' : 'yellow'}-900/30 border border-{result.leads_created > 0 ? 'green' : 'yellow'}-700/50 rounded-lg p-4 mb-4">
          <p class="text-xl font-bold {result.leads_created > 0 ? 'text-green-400' : 'text-yellow-400'}">
            Leads criados: {result.leads_created}
          </p>
        </div>
      {/if}
    {:else}
      <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
        <p class="text-green-400 font-semibold mb-2">Resultado:</p>
        <pre class="text-gray-300 text-sm whitespace-pre-wrap overflow-auto max-h-[600px]">{JSON.stringify(result, null, 2)}</pre>
      </div>
    {/if}
  {/if}

  <div class="mt-8 bg-gray-800/50 border border-gray-700 rounded-lg p-4">
    <p class="text-gray-300 font-semibold mb-2">Como funciona:</p>
    <ol class="text-gray-400 text-sm space-y-1 list-decimal ml-4">
      <li><strong>Testar Comentarios</strong> - Verifica se a API do Instagram retorna comentarios nos seus posts</li>
      <li><strong>Debug Ciclo Automacao</strong> - Sincroniza posts, verifica comentarios, e cria leads (mostra cada passo)</li>
    </ol>
  </div>
</div>
