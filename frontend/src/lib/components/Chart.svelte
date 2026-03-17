<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  export let type: 'line' | 'bar' | 'area' | 'donut' = 'line';
  export let series: any[] = [];
  export let categories: string[] = [];
  export let title: string = '';
  export let height: number = 280;
  export let colors: string[] = ['#0ea5e9', '#8b5cf6', '#10b981', '#f97316'];

  let chartEl: HTMLElement;
  let chart: any;

  onMount(async () => {
    const ApexCharts = (await import('apexcharts')).default;

    const options: any = {
      chart: {
        type,
        height,
        background: 'transparent',
        toolbar: { show: false },
        animations: { enabled: true, speed: 600 },
      },
      theme: { mode: 'dark' },
      colors,
      series,
      xaxis: {
        categories,
        labels: { style: { colors: '#6b7280', fontSize: '12px' } },
        axisBorder: { color: '#374151' },
        axisTicks: { color: '#374151' },
        title: { style: { color: '#6b7280' } },
      },
      yaxis: {
        labels: { style: { colors: '#6b7280', fontSize: '12px' } },
        title: { style: { color: '#6b7280' } },
      },
      grid: {
        borderColor: '#1f2937',
        strokeDashArray: 4,
      },
      legend: {
        labels: { colors: '#9ca3af' },
        offsetY: 0,
      },
      dataLabels: { enabled: false },
      stroke: { curve: 'smooth', width: 2 },
      fill: type === 'area' ? {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.05,
          stops: [0, 100],
        },
      } : { type: 'solid' },
      tooltip: {
        theme: 'dark',
        style: { fontSize: '12px' },
      },
      title: {
        text: title || '',
        style: { color: '#f9fafb', fontSize: '14px', fontWeight: '600' },
        offsetY: 0,
      },
      subtitle: {
        text: '',
        offsetY: 0,
      },
    };

    chart = new ApexCharts(chartEl, options);
    chart.render();
  });

  $: if (chart && series) {
    chart.updateSeries(series);
  }

  $: if (chart && categories) {
    chart.updateOptions({ xaxis: { categories } });
  }

  onDestroy(() => {
    chart?.destroy();
  });
</script>

<div bind:this={chartEl}></div>
