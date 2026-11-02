<script lang="ts">
  import ghost from "../../../assets/illus/halloween/ghost-peek.svg?raw";
  import pumpkin from "../../../assets/illus/halloween/pumpkin.svg?raw";
  import { CANDY } from "../../../lib/fx/sprites-candy";
</script>

<span class="hw-ghost fx-ghost" data-par="0.1" aria-hidden="true"><span class="hw-float fx-float">{@html ghost}</span></span>
<span class="hw-pumpkin" data-par="0.05" aria-hidden="true">{@html pumpkin}</span>
<span class="hw-landed fx-landed l1" aria-hidden="true">{@html CANDY[0]}</span>
<span class="hw-landed fx-landed l2" aria-hidden="true">{@html CANDY[3]}</span>
<span class="hw-landed fx-landed l3" aria-hidden="true">{@html CANDY[2]}</span>
