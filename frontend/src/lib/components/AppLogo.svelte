<script lang="ts">
  export let size: 'xs' | 'sm' | 'md' | 'lg' = 'md';

  const sizeMap = {
    xs: 'w-7 h-7',
    sm: 'w-9 h-9',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };

  const svgSizeMap = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5',
    md: 'w-7 h-7',
    lg: 'w-9 h-9',
  };

  const roundedMap = {
    xs: 'rounded-md',
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
  };
</script>

<div
  class="inline-flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-700 shadow-lg shadow-emerald-900/40 {sizeMap[size]} {roundedMap[size]} shrink-0"
>
  <svg
    class={svgSizeMap[size]}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <!-- Baseline -->
    <line x1="5" y1="33" x2="35" y2="33" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>

    <!-- Rising bars -->
    <rect x="5.5" y="22" width="6" height="11" rx="1.5" fill="white" opacity="0.2"/>
    <rect x="17" y="15" width="6" height="18" rx="1.5" fill="white" opacity="0.2"/>
    <rect x="28.5" y="8" width="6" height="25" rx="1.5" fill="white" opacity="0.2"/>

    <!-- Trend line -->
    <polyline
      points="8.5,20 20,12.5 31.5,6"
      stroke="white"
      stroke-width="2.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />

    <!-- Data nodes -->
    <circle cx="8.5" cy="20" r="2.8" fill="white"/>
    <circle cx="20" cy="12.5" r="2.8" fill="white"/>
    <circle cx="31.5" cy="6" r="3.2" fill="white"/>

    <!-- Pulse ring on peak node -->
    <circle cx="31.5" cy="6" r="6.5" stroke="white" stroke-width="1" opacity="0.25"/>
    <circle cx="31.5" cy="6" r="10" stroke="white" stroke-width="0.7" opacity="0.1"/>
  </svg>
</div>
