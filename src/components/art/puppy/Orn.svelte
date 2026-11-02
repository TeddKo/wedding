<script lang="ts">
  import { BONE_SHAPES, pawShapes } from "../../../lib/fx/sprites-paw";

  const paws = [0, 1, 2, 3, 4].map((i) => ({ x: 22 + i * 32, y: 28 - i * 3.5 + (i % 2 ? -7 : 7) }));
</script>

<svg class="pup-orn" viewBox="0 0 200 44" width="200" height="44" aria-hidden="true" focusable="false">
  {#each paws as p}
    <g transform="translate({p.x} {p.y}) rotate(84) translate(-7 -7) scale(0.583)">
      <g class="pp" fill="#b27085" opacity="0.5">{@html pawShapes}</g>
    </g>
  {/each}
  <g transform="translate(176 17) rotate(-14) scale(0.75) translate(-12 -6)">
    <g class="pp" fill="#b27085" opacity="0.5">{@html BONE_SHAPES}</g>
  </g>
</svg>
