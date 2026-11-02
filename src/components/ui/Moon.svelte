<script lang="ts">
  const id = $props.id();
</script>

<svg class="orn-moon" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
  <defs>
    <radialGradient id="mf-{id}" cx="38%" cy="34%" r="75%">
      <stop offset="0" stop-color="#fbf3df" />
      <stop offset="0.7" stop-color="#e9dcc0" />
      <stop offset="1" stop-color="#c9b88f" />
    </radialGradient>
  </defs>
  <circle cx="60" cy="60" r="54" fill="url(#mf-{id})" />
  <g fill="#b8a678" opacity="0.45">
    <circle cx="42" cy="44" r="9" />
    <circle cx="76" cy="70" r="12" />
    <circle cx="58" cy="86" r="5" />
    <circle cx="84" cy="38" r="4" />
    <circle cx="34" cy="72" r="4" />
  </g>
</svg>
