<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let subtitle: string = '';
  export let icon: string = '';
  export let trend: number | null = null; // positive = up, negative = down
  export let color: 'blue' | 'green' | 'purple' | 'orange' = 'blue';

  const colorMap = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
  };
</script>

<div class="card flex flex-col gap-3">
  <div class="flex items-center justify-between">
    <span class="text-gray-400 text-sm font-medium">{title}</span>
    {#if icon}
      <div class="w-10 h-10 rounded-lg flex items-center justify-center text-xl {colorMap[color]}">
        {icon}
      </div>
    {/if}
  </div>

  <div class="flex items-end gap-3">
    <span class="text-3xl font-bold text-white">{value}</span>
    {#if trend !== null}
      <span class="text-sm font-medium mb-1 {trend >= 0 ? 'text-green-400' : 'text-red-400'}">
        {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
      </span>
    {/if}
  </div>

  {#if subtitle}
    <p class="text-gray-500 text-xs">{subtitle}</p>
  {/if}
</div>
