<script lang="ts">
  import { onMount } from 'svelte';
  import { leadsService } from '$lib/services/leadsService';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { toast } from '$lib/stores/notifications';

  let leads: any[] = [];
  let pagination = { page: 1, limit: 20, total: 0, pages: 1 };
  let loading = true;
  let filterStatus = '';
  let filterPlatform = '';
  let exportingCSV = false;

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'novo', label: 'Novo' },
    { value: 'contatado', label: 'Contatado' },
    { value: 'respondeu', label: 'Respondeu' },
    { value: 'convertido', label: 'Convertido' },
    { value: 'descartado', label: 'Descartado' },
  ];

  const statusBadgeMap: Record<string, string> = {
    novo: 'badge-blue',
    contatado: 'badge-yellow',
    respondeu: 'badge-green',
    convertido: 'badge-green',
    descartado: 'badge-gray',
  };

  async function loadLeads(page = 1) {
    loading = true;
    try {
      const params: Record<string, string | number> = { page, limit: 20 };
      if (filterStatus) params.status = filterStatus;
      if (filterPlatform) params.plataforma = filterPlatform;

      const result = await leadsService.getLeads(params);
      leads = result.data;
      pagination = result.pagination;
    } catch {
      toast.error('Erro ao carregar leads');
    } finally {
      loading = false;
    }
  }

  onMount(() => loadLeads());

  async function handleStatusChange(leadId: number, newStatus: string) {
    const lead = leads.find((l) => l.id === leadId);
    const previousStatus = lead?.status;
    try {
      await leadsService.updateStatus(leadId, newStatus);
      toast.success('Status atualizado!');
    } catch {
      // Rollback on error
      if (lead && previousStatus) lead.status = previousStatus;
      leads = [...leads];
      toast.error('Erro ao atualizar status');
    }
  }

  async function handleDelete(leadId: number) {
    if (!confirm('Remover este lead?')) return;
    try {
      await leadsService.deleteLead(leadId);
      leads = leads.filter((l) => l.id !== leadId);
      toast.success('Lead removido');
    } catch {
      toast.error('Erro ao remover lead');
    }
  }

  async function handleExportCSV() {
    exportingCSV = true;
    try {
      await leadsService.exportCSV();
      toast.success('CSV exportado!');
    } catch {
      toast.error('Erro ao exportar');
    } finally {
      exportingCSV = false;
    }
  }
</script>

<svelte:head>
  <title>Leads - Social Analytics</title>
</svelte:head>

<div class="flex items-start justify-between mb-8">
  <PageHeader title="Leads" subtitle="Leads capturados automaticamente pelas suas automações" />

  <button on:click={handleExportCSV} disabled={exportingCSV} class="btn-secondary text-sm">
    {exportingCSV ? 'Exportando...' : '📥 Exportar CSV'}
  </button>
</div>

<!-- Filters -->
<div class="flex gap-3 mb-6">
  <select bind:value={filterStatus} on:change={() => loadLeads()} class="input w-auto text-sm">
    {#each statusOptions as opt}
      <option value={opt.value}>{opt.label}</option>
    {/each}
  </select>

  <select bind:value={filterPlatform} on:change={() => loadLeads()} class="input w-auto text-sm">
    <option value="">Todas as plataformas</option>
    <option value="instagram">Instagram</option>
    <option value="tiktok">TikTok</option>
  </select>
</div>

{#if loading}
  <div class="flex justify-center py-20">
    <LoadingSpinner size="lg" />
  </div>
{:else}
  <div class="card p-0 overflow-hidden">
    <div class="overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="border-b border-gray-800">
          <tr class="text-gray-400">
            <th class="text-left px-6 py-4 font-medium">Usuário</th>
            <th class="text-left px-6 py-4 font-medium">Plataforma</th>
            <th class="text-left px-6 py-4 font-medium">Origem</th>
            <th class="text-left px-6 py-4 font-medium">Data</th>
            <th class="text-left px-6 py-4 font-medium">Status</th>
            <th class="text-left px-6 py-4 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {#each leads as lead}
            <tr class="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
              <td class="px-6 py-4">
                <div>
                  <p class="text-white font-medium">@{lead.usuario_plataforma}</p>
                  {#if lead.nome}
                    <p class="text-gray-500 text-xs">{lead.nome}</p>
                  {/if}
                </div>
              </td>
              <td class="px-6 py-4">
                <span class="text-gray-300">
                  {lead.plataforma === 'instagram' ? '📸 Instagram' : '🎵 TikTok'}
                </span>
              </td>
              <td class="px-6 py-4">
                <p class="text-gray-400 text-xs max-w-[160px] truncate" title={lead.origem}>
                  {lead.palavra_chave ? `Keyword: "${lead.palavra_chave}"` : lead.origem ?? '-'}
                </p>
              </td>
              <td class="px-6 py-4 text-gray-400 text-xs">{lead.data_captura}</td>
              <td class="px-6 py-4">
                <select
                  bind:value={lead.status}
                  on:change={() => handleStatusChange(lead.id, lead.status)}
                  class="bg-gray-800 border border-gray-700 text-white text-xs rounded px-2 py-1"
                >
                  <option value="novo">Novo</option>
                  <option value="contatado">Contatado</option>
                  <option value="respondeu">Respondeu</option>
                  <option value="convertido">Convertido</option>
                  <option value="descartado">Descartado</option>
                </select>
              </td>
              <td class="px-6 py-4">
                <button
                  on:click={() => handleDelete(lead.id)}
                  class="text-gray-500 hover:text-red-400 transition-colors text-xs"
                >
                  Remover
                </button>
              </td>
            </tr>
          {/each}

          {#if leads.length === 0}
            <tr>
              <td colspan="6" class="px-6 py-16 text-center text-gray-500">
                Nenhum lead encontrado. Configure automações para capturar leads.
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination -->
    {#if pagination.pages > 1}
      <div class="flex items-center justify-between px-6 py-4 border-t border-gray-800">
        <p class="text-gray-500 text-sm">{pagination.total} leads no total</p>
        <div class="flex gap-2">
          <button
            disabled={pagination.page === 1}
            on:click={() => loadLeads(pagination.page - 1)}
            class="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span class="px-3 py-1.5 text-gray-400 text-sm">
            {pagination.page} / {pagination.pages}
          </span>
          <button
            disabled={pagination.page === pagination.pages}
            on:click={() => loadLeads(pagination.page + 1)}
            class="btn-secondary text-sm px-3 py-1.5 disabled:opacity-40"
          >
            Próximo
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}
