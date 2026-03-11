<script lang="ts">
  import { page } from '$app/stores';
  import { authService } from '$lib/services/authService';
  import { authStore } from '$lib/stores/auth';
  import { createEventDispatcher } from 'svelte';

  export let open = false;

  const dispatch = createEventDispatcher();
  const close = () => dispatch('close');

  const navItems = [
    { href: '/', icon: '📊', label: 'Dashboard' },
    { href: '/analytics', icon: '📈', label: 'Analytics' },
    { href: '/leads', icon: '👥', label: 'Leads' },
    { href: '/automation', icon: '⚡', label: 'Automações' },
    { href: '/settings', icon: '⚙️', label: 'Configurações' },
  ];

  $: currentPath = $page.url.pathname;
</script>

<!-- Backdrop (mobile only) -->
{#if open}
  <div
    class="fixed inset-0 bg-black/60 z-30 lg:hidden"
    on:click={close}
    on:keydown={(e) => e.key === 'Escape' && close()}
    role="button"
    tabindex="-1"
    aria-label="Fechar menu"
  ></div>
{/if}

<aside
  class="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-40
         transition-transform duration-300 ease-in-out
         {open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0"
>
  <!-- Logo -->
  <div class="p-5 border-b border-gray-800 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-lg">
        🚀
      </div>
      <div>
        <h1 class="font-bold text-white text-sm">Social Analytics</h1>
        <p class="text-gray-500 text-xs">EliteWeb Platform</p>
      </div>
    </div>
    <button
      on:click={close}
      class="lg:hidden text-gray-400 hover:text-white p-1 rounded"
      aria-label="Fechar menu"
    >✕</button>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-4 space-y-1 overflow-y-auto">
    {#each navItems as item}
      <a
        href={item.href}
        on:click={close}
        class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150
          {currentPath === item.href
            ? 'bg-primary-600 text-white'
            : 'text-gray-400 hover:text-white hover:bg-gray-800'}"
      >
        <span class="text-lg">{item.icon}</span>
        {item.label}
      </a>
    {/each}
  </nav>

  <!-- User section -->
  <div class="p-4 border-t border-gray-800">
    <div class="flex items-center gap-3 mb-3">
      <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold shrink-0">
        {($authStore.user?.nome?.[0] ?? 'U').toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-white text-sm font-medium truncate">{$authStore.user?.nome ?? ''}</p>
        <p class="text-gray-500 text-xs truncate">{$authStore.user?.email ?? ''}</p>
      </div>
    </div>
    <button
      on:click={() => authService.logout()}
      class="w-full text-left text-gray-400 hover:text-red-400 text-sm px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
    >
      Sair
    </button>
  </div>
</aside>
