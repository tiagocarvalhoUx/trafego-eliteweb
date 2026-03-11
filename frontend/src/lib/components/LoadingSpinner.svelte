<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';

  const sizeMap = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  };
</script>

<div class="flex items-center justify-center">
  <div
    class="{sizeMap[size]} border-gray-700 border-t-primary-500 rounded-full animate-spin"
  ></div>
</div>
