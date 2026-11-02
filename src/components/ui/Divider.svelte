<script lang="ts">
  import { BAT_PATH } from "../../lib/bat";
</script>

<svg class="orn-divider" viewBox="0 0 240 24" aria-hidden="true" focusable="false">
  <g fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round">
    <path d="M4 12H92" pathLength="1" />
    <path d="M236 12H148" pathLength="1" />
    <path d="M92 12c8 0 10-8 18-8m-18 8c8 0 10 8 18 8m-18-8h8" pathLength="1" />
    <path d="M148 12c-8 0-10-8-18-8m18 8c-8 0-10 8-18 8m18-8h-8" pathLength="1" />
  </g>
  <path data-th="halloween" transform="translate(104 4) scale(0.5)" fill="currentColor" d={BAT_PATH} />
  <text data-th="dev" x="120" y="16" text-anchor="middle" font-size="11" font-family="JetBrains Mono, ui-monospace, Menlo, monospace" fill="currentColor">&lt;/&gt;</text>
  <g data-th="puppy" fill="currentColor" transform="translate(120 12) scale(0.55)"><ellipse cx="0" cy="6" rx="8" ry="7" /><circle cx="-9" cy="-4" r="3.4" /><circle cx="-3" cy="-9" r="3.4" /><circle cx="3" cy="-9" r="3.4" /><circle cx="9" cy="-4" r="3.4" /></g>
</svg>
