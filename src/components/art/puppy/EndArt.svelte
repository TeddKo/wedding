<script lang="ts">
  import DogsRest from "../../ui/DogsRest.svelte";
  import { BALL_SVG } from "../../../lib/fx/sprites-paw";
</script>

<div class="pe">
  <DogsRest />
  <span class="pe-ball">{@html BALL_SVG}</span>
</div>
