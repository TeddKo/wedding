<script lang="ts">
  import DogsCover from "../../ui/DogsCover.svelte";
  import maltese from "../../../assets/illus/puppy/maltese-run.svg?raw";
  import nunbaki from "../../../assets/illus/puppy/nunbaki-run.svg?raw";
  import { BALL_SVG } from "../../../lib/fx/sprites-paw";
</script>

<!--
  기본 DOM 상태 = 앉은 쌍 + 공(최종 정지). 달리는 두 마리는 숨김.
  fx/puppy.ts 가 [data-run] 요소를 WAAPI 로 움직인다.
-->
<div class="pc">
  <div class="pc-sit fx-pc-sit"><DogsCover /></div>
  <div class="pc-run pc-k" data-run="k"><div class="pc-in">{@html nunbaki}</div></div>
  <div class="pc-run pc-m" data-run="m"><div class="pc-in">{@html maltese}</div></div>
  <div class="pc-ball fx-pc-ball" data-run="ball"><div class="pc-in">{@html BALL_SVG}</div></div>
</div>
