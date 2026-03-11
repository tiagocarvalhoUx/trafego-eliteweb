<script lang="ts">
  import { page } from '$app/stores';
  import { authService } from '$lib/services/authService';
  import { authStore } from '$lib/stores/auth';

  const navItems = [
    { href: '/', icon: '📊', label: 'Dashboard' },
    { href: '/analytics', icon: '📈', label: 'Analytics' },
    { href: '/leads', icon: '👥', label: 'Leads' },
    { href: '/automation', icon: '⚡', label: 'Automações' },
    { href: '/settings', icon: '⚙️', label: 'Configurações' },
  ];

  $: currentPath = $page.url.pathname;
</script>

<aside class="fixed left-0 top-0 h-screen w-64 bg-gray-900 border-r border-gray-800 flex flex-col z-40">
  <!-- Logo -->
  <div class="p-6 border-b border-gray-800">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center text-lg">
        🚀
      </div>
      <div>
        <h1 class="font-bold text-white text-sm">Social Analytics</h1>
        <p class="text-gray-500 text-xs">EliteWeb Platform</p>
      </div>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="flex-1 p-4 space-y-1">
    {#each navItems as item}
      <a
        href={item.href}
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
      <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-sm font-bold">
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
