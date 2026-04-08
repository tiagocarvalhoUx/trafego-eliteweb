<script lang="ts">
  import { goto } from '$app/navigation';
  import { authService } from '$lib/services/authService';
  import { toast } from '$lib/stores/notifications';
  import AppLogo from '$lib/components/AppLogo.svelte';

  let nome = '';
  let email = '';
  let senha = '';
  let loading = false;

  async function handleRegister() {
    loading = true;
    try {
      await authService.register({ nome, email, senha });
      goto('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao cadastrar');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Cadastro - Social Analytics</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-950 px-4">
  <div class="w-full max-w-md">
    <div class="text-center mb-8">
      <div class="mb-4 flex justify-center">
        <AppLogo size="lg" />
      </div>
      <h1 class="text-2xl font-bold text-white">Criar conta</h1>
      <p class="text-gray-400 mt-1 text-sm">Comece a automatizar suas redes sociais</p>
    </div>

    <div class="card">
      <form on:submit|preventDefault={handleRegister} class="space-y-4">
        <div>
          <label for="nome" class="block text-sm font-medium text-gray-300 mb-1.5">Nome completo</label>
          <input id="nome" type="text" bind:value={nome} class="input" placeholder="Seu nome" required />
        </div>

        <div>
          <label for="email" class="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
          <input id="email" type="email" bind:value={email} class="input" placeholder="seu@email.com" required />
        </div>

        <div>
          <label for="senha" class="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
          <input id="senha" type="password" bind:value={senha} class="input" placeholder="Mínimo 6 caracteres" required minlength="6" />
        </div>

        <button type="submit" class="btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
      </form>

      <p class="text-center text-gray-400 text-sm mt-4">
        Já tem conta?
        <a href="/login" class="text-emerald-400 hover:text-emerald-300 font-medium">Entrar</a>
      </p>
    </div>
  </div>
</div>
