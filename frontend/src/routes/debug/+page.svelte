<script lang="ts">
  import api from '$lib/services/api';

  let loading = false;
  let result: any = null;
  let error = '';

  async function testComments() {
    loading = true;
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

  async function runCycle() {
    loading = true;
    error = '';
    result = null;
    try {
      const { data } = await api.post('/automation/run-cycle');
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
      {loading ? 'Carregando...' : 'Testar Comentarios'}
    </button>

    <button
      on:click={runCycle}
      disabled={loading}
      class="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg transition-colors"
    >
      {loading ? 'Carregando...' : 'Rodar Ciclo Automacao'}
    </button>
  </div>

  {#if error}
    <div class="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-4">
      <p class="text-red-300 font-semibold">Erro:</p>
      <pre class="text-red-200 text-sm mt-2 whitespace-pre-wrap">{error}</pre>
    </div>
  {/if}

  {#if result}
    <div class="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <p class="text-green-400 font-semibold mb-2">Resultado:</p>
      <pre class="text-gray-300 text-sm whitespace-pre-wrap overflow-auto max-h-[600px]">{JSON.stringify(result, null, 2)}</pre>
    </div>
  {/if}

  <div class="mt-8 bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-4">
    <p class="text-yellow-300 font-semibold mb-2">Importante:</p>
    <ul class="text-yellow-200/80 text-sm space-y-1 list-disc ml-4">
      <li>Se os comentarios voltam <strong>0</strong>, o app Meta precisa estar <strong>Publicado (Live)</strong></li>
      <li>Em modo Development, a API do Instagram so retorna comentarios de usuarios com papel no app</li>
      <li>Va em <strong>Meta Developer Portal &gt; App Settings &gt; Basic &gt; App Mode</strong> e mude para <strong>Live</strong></li>
      <li>Depois de mudar para Live, reconecte sua conta Instagram em Configuracoes</li>
    </ul>
  </div>
</div>
