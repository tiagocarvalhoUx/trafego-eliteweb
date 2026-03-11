<script lang="ts">
  export let title: string;
  export let subtitle: string = '';
</script>

<div class="mb-8">
  <h1 class="text-2xl font-bold text-white">{title}</h1>
  {#if subtitle}
    <p class="text-gray-400 mt-1 text-sm">{subtitle}</p>
  {/if}
</div>
