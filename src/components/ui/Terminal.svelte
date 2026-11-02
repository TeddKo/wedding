<script lang="ts">
  let { groom, bride }: { groom: string; bride: string } = $props();
</script>

<svg class="orn-term" viewBox="0 0 200 140" aria-hidden="true" focusable="false">
  <rect x="2" y="2" width="196" height="136" rx="10" fill="#0d1117" stroke="#30363d" stroke-width="2" />
  <path d="M2 24h196" stroke="#30363d" stroke-width="1.5" />
  <circle cx="16" cy="13" r="4" fill="#ff5f57" /><circle cx="29" cy="13" r="4" fill="#febc2e" /><circle cx="42" cy="13" r="4" fill="#28c840" />
  <g font-family="IBM Plex Mono, ui-monospace, Menlo, monospace" font-size="10.5">
    <text x="12" y="46"><tspan fill="#3fb950">$</tspan><tspan fill="#e6edf3" dx="6">git checkout -b forever</tspan></text>
    <text x="12" y="66"><tspan fill="#3fb950">$</tspan><tspan fill="#e6edf3" dx="6">git merge {groom} {bride}</tspan></text>
    <text x="12" y="86" fill="#9da7b3">Merged by the <tspan fill="#f778ba">'love'</tspan> strategy.</text>
    <text x="12" y="104" fill="#9da7b3">2 hearts, <tspan fill="#3fb950">0 conflicts</tspan></text>
    <text x="12" y="124"><tspan fill="#3fb950">$</tspan></text>
  </g>
  <rect class="cursor" x="24" y="115" width="7" height="12" fill="#e6edf3" />
</svg>

<style>
  .cursor { animation: blink 1.05s steps(1) infinite; }
  @keyframes blink { 50% { opacity: 0; } }
  @media (prefers-reduced-motion: reduce) { .cursor { animation: none; } }
</style>
