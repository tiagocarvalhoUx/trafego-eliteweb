<script lang="ts">
  import { goto } from '$app/navigation';
  import { authService } from '$lib/services/authService';
  import { toast } from '$lib/stores/notifications';
  import AppLogo from '$lib/components/AppLogo.svelte';

  let email = '';
  let senha = '';
  let loading = false;

  async function handleLogin() {
    loading = true;
    try {
      await authService.login({ email, senha });
      goto('/');
    } catch (err: any) {
      toast.error(err.response?.data?.message ?? 'Erro ao fazer login');
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - Social Analytics</title>
</svelte:head>

<div class="min-h-screen flex items-center justify-center bg-gray-950 px-4">
  <div class="w-full max-w-md">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="mb-4 flex justify-center">
        <AppLogo size="lg" />
      </div>
      <h1 class="text-2xl font-bold text-white">Social Analytics</h1>
      <p class="text-gray-400 mt-1 text-sm">Plataforma de automação e analytics</p>
    </div>

    <!-- Form -->
    <div class="card">
      <h2 class="text-lg font-semibold text-white mb-6">Entrar na conta</h2>

      <form on:submit|preventDefault={handleLogin} class="space-y-4">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            class="input"
            placeholder="seu@email.com"
            required
          />
        </div>

        <div>
          <label for="senha" class="block text-sm font-medium text-gray-300 mb-1.5">Senha</label>
          <input
            id="senha"
            type="password"
            bind:value={senha}
            class="input"
            placeholder="••••••••"
            required
          />
        </div>

        <button type="submit" class="btn-primary w-full py-3" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p class="text-center text-gray-400 text-sm mt-4">
        Não tem conta?
        <a href="/register" class="text-emerald-400 hover:text-emerald-300 font-medium">Cadastre-se</a>
      </p>
    </div>
  </div>
</div>
