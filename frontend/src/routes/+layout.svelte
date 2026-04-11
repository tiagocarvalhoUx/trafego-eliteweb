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
  import AppLogo from '$lib/components/AppLogo.svelte';

  const publicRoutes = ['/login', '/register', '/privacy', '/terms'];
  $: isPublicRoute = publicRoutes.includes($page.url.pathname);

  let sidebarOpen = false;

  // Close sidebar on route change
  $: $page.url.pathname, (sidebarOpen = false);

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
    <Sidebar bind:open={sidebarOpen} on:close={() => (sidebarOpen = false)} />

    <!-- Mobile top bar -->
    <header class="lg:hidden fixed top-0 left-0 right-0 h-14 bg-gray-900 border-b border-gray-800 z-20 flex items-center px-4 gap-3">
      <button
        on:click={() => (sidebarOpen = true)}
        class="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
        aria-label="Abrir menu"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <div class="flex items-center gap-2">
        <AppLogo size="xs" />
        <span class="font-bold text-white text-sm">Social Analytics</span>
      </div>
    </header>

    <main class="flex-1 lg:ml-64 pt-14 lg:pt-0 p-4 lg:p-8 overflow-auto min-w-0">
      <slot />
    </main>
  </div>
{/if}
