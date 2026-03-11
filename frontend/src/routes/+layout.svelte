<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authStore, isAuthenticated } from '$lib/stores/auth';
  import { authService } from '$lib/services/authService';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  const publicRoutes = ['/login', '/register'];
  $: isPublicRoute = publicRoutes.includes($page.url.pathname);

  onMount(async () => {
    await authService.loadUser();

    if (!isPublicRoute && !isAuthenticated($authStore)) {
      goto('/login');
    }
  });

  $: {
    if (!$authStore.loading && !isPublicRoute && !isAuthenticated($authStore)) {
      goto('/login');
    }
  }
</script>

<ToastContainer />

{#if $authStore.loading}
  <div class="min-h-screen flex items-center justify-center bg-gray-950">
    <LoadingSpinner size="lg" />
  </div>
{:else if isPublicRoute}
  <slot />
{:else if isAuthenticated($authStore)}
  <div class="flex min-h-screen bg-gray-950">
    <Sidebar />
    <main class="flex-1 ml-64 p-8 overflow-auto">
      <slot />
    </main>
  </div>
{/if}
