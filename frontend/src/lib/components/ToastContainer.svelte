<script lang="ts">
  import { toasts } from '$lib/stores/notifications';

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const colorMap = {
    success: 'bg-green-500/10 border-green-500/30 text-green-300',
    error: 'bg-red-500/10 border-red-500/30 text-red-300',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-300',
  };
</script>

<div class="fixed top-16 lg:top-4 right-2 lg:right-4 z-50 flex flex-col gap-2 w-[calc(100vw-1rem)] sm:w-80 max-w-sm">
  {#each $toasts as toast (toast.id)}
    <div
      class="flex items-start gap-3 p-4 rounded-lg border {colorMap[toast.type]}
             animate-in slide-in-from-right duration-300"
    >
      <span class="font-bold text-sm mt-0.5">{iconMap[toast.type]}</span>
      <p class="text-sm flex-1">{toast.message}</p>
    </div>
  {/each}
</div>
