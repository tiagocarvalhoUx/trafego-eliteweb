<script lang="ts">
  import { onMount } from 'svelte';
  import { socialService } from '$lib/services/socialService';
  import PageHeader from '$lib/components/PageHeader.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import { toast } from '$lib/stores/notifications';

  let accounts: any[] = [];
  let loading = true;
  let collecting: Record<number, boolean> = {};

  let senhaAtual = '';
  let novaSenha = '';
  let confirmarSenha = '';
  let savingPassword = false;

  async function changePassword() {
    if (novaSenha !== confirmarSenha) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (novaSenha.length < 6) {
      toast.error('Nova senha deve ter no mínimo 6 caracteres');
      return;
    }
    savingPassword = true;
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_atual: senhaAtual, nova_senha: novaSenha }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Senha alterada com sucesso!');
        senhaAtual = '';
        novaSenha = '';
        confirmarSenha = '';
      } else {
        toast.error(data.message || 'Erro ao alterar senha');
      }
    } catch {
      toast.error('Erro ao alterar senha');
    } finally {
      savingPassword = false;
    }
  }

  onMount(async () => {
    try {
      accounts = await socialService.getAccounts();
    } catch {
      toast.error('Erro ao carregar contas');
    } finally {
      loading = false;
    }
  });

  async function connectInstagram() {
    try {
      const url = await socialService.getInstagramAuthUrl();
      window.location.href = url;
    } catch {
      toast.error('Erro ao iniciar conexão com Instagram');
    }
  }

  async function connectTikTok() {
    try {
      const url = await socialService.getTikTokAuthUrl();
      window.location.href = url;
    } catch {
      toast.error('Erro ao iniciar conexão com TikTok');
    }
  }

  async function disconnectAccount(id: number, name: string) {
    if (!confirm(`Desconectar conta @${name}?`)) return;
    try {
      await socialService.disconnectAccount(id);
      accounts = accounts.filter((a) => a.id !== id);
      toast.success('Conta desconectada');
    } catch {
      toast.error('Erro ao desconectar conta');
    }
  }

  async function triggerCollection(id: number) {
    collecting = { ...collecting, [id]: true };
    try {
      await socialService.triggerCollection(id);
      toast.success('Coleta de dados iniciada em background!');
    } catch {
      toast.error('Erro ao iniciar coleta');
    } finally {
      collecting = { ...collecting, [id]: false };
    }
  }

  const activeAccounts = (platform: string) =>
    accounts.filter((a) => a.plataforma === platform && a.ativo);
</script>

<svelte:head>
  <title>Configurações - Social Analytics</title>
</svelte:head>

<PageHeader title="Configurações" subtitle="Gerencie suas contas de redes sociais conectadas" />

{#if loading}
  <div class="flex justify-center py-20">
    <LoadingSpinner size="lg" />
  </div>
{:else}
  <!-- Connected Accounts -->
  <div class="card mb-6">
    <h2 class="text-base font-semibold text-white mb-4">Contas Conectadas</h2>

    {#if accounts.filter((a) => a.ativo).length === 0}
      <p class="text-gray-500 text-sm text-center py-8">Nenhuma conta conectada ainda.</p>
    {:else}
      <div class="space-y-3">
        {#each accounts.filter((a) => a.ativo) as account}
          <div class="flex items-center gap-4 p-4 bg-gray-800/50 rounded-xl">
            <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl
              {account.plataforma === 'instagram' ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-black'}">
              {account.plataforma === 'instagram' ? '📸' : '🎵'}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-white font-medium">@{account.conta_nome}</p>
              <p class="text-gray-500 text-xs capitalize">{account.plataforma} · Conectado em {new Date(account.data_conexao).toLocaleDateString('pt-BR')}</p>
            </div>
            <div class="flex gap-2 shrink-0">
              <button
                on:click={() => triggerCollection(account.id)}
                disabled={collecting[account.id]}
                class="btn-secondary text-xs py-1.5 px-3"
              >
                {collecting[account.id] ? 'Coletando...' : '🔄 Coletar dados'}
              </button>
              <button
                on:click={() => disconnectAccount(account.id, account.conta_nome)}
                class="text-xs px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Desconectar
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Change Password -->
  <div class="card mb-6">
    <h2 class="text-base font-semibold text-white mb-4">Alterar Senha</h2>
    <div class="space-y-3 max-w-sm">
      <div>
        <label class="block text-xs text-gray-400 mb-1">Senha atual</label>
        <input type="password" bind:value={senhaAtual} class="input w-full" placeholder="••••••••" />
      </div>
      <div>
        <label class="block text-xs text-gray-400 mb-1">Nova senha</label>
        <input type="password" bind:value={novaSenha} class="input w-full" placeholder="••••••••" />
      </div>
      <div>
        <label class="block text-xs text-gray-400 mb-1">Confirmar nova senha</label>
        <input type="password" bind:value={confirmarSenha} class="input w-full" placeholder="••••••••" />
      </div>
      <button on:click={changePassword} disabled={savingPassword} class="btn-primary text-sm">
        {savingPassword ? 'Salvando...' : 'Alterar senha'}
      </button>
    </div>
  </div>

  <!-- Connect New Accounts -->
  <div class="card">
    <h2 class="text-base font-semibold text-white mb-4">Conectar Nova Conta</h2>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

      <!-- Instagram -->
      <div class="p-5 bg-gradient-to-br from-pink-500/10 to-purple-600/10 border border-pink-500/20 rounded-xl">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-2xl">📸</span>
          <div>
            <p class="text-white font-semibold">Instagram</p>
            <p class="text-gray-400 text-xs">Conecte via Instagram Graph API</p>
          </div>
        </div>
        <p class="text-gray-400 text-xs mb-4">
          Colete curtidas, comentários, seguidores, alcance e impressões dos seus posts.
        </p>
        <button on:click={connectInstagram} class="btn-primary w-full text-sm">
          Conectar Instagram
        </button>
      </div>

      <!-- TikTok -->
      <div class="p-5 bg-gradient-to-br from-red-500/10 to-cyan-500/10 border border-red-500/20 rounded-xl">
        <div class="flex items-center gap-3 mb-3">
          <span class="text-2xl">🎵</span>
          <div>
            <p class="text-white font-semibold">TikTok</p>
            <p class="text-gray-400 text-xs">Conecte via TikTok For Developers</p>
          </div>
        </div>
        <p class="text-gray-400 text-xs mb-4">
          Monitore visualizações, curtidas, comentários, compartilhamentos e crescimento.
        </p>
        <button on:click={connectTikTok} class="btn-primary w-full text-sm">
          Conectar TikTok
        </button>
      </div>
    </div>

    <!-- Instructions -->
    <div class="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg">
      <p class="text-blue-300 text-sm font-medium mb-2">ℹ️ Pré-requisitos</p>
      <ul class="text-gray-400 text-xs space-y-1">
        <li>• Instagram: Configure seu App no Meta for Developers e defina as variáveis INSTAGRAM_APP_ID e INSTAGRAM_APP_SECRET no .env do backend</li>
        <li>• TikTok: Registre seu App em developers.tiktok.com e defina TIKTOK_CLIENT_KEY e TIKTOK_CLIENT_SECRET no .env</li>
        <li>• Contas Business/Creator têm acesso a métricas mais detalhadas</li>
      </ul>
    </div>
  </div>
{/if}
