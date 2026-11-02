# 모바일 청첩장 (Halloween gothic)

Astro 정적 사이트 + Svelte 5 아일랜드. 배포 주소 예정: `https://teddko.github.io/wedding/`

## 구조 (인터랙션 = Svelte 아일랜드)

콘텐츠는 모두 서버 HTML 에 들어 있고 아일랜드는 그 위에 연출만 얹는다. JS 가 꺼져도 이름, 날짜, 장소, 인사말, 달력, 링크가 그대로 보인다.

| 컴포넌트 | 하이드레이션 | 역할 |
|---|---|---|
| `IntroGate.svelte` | load | 밀랍 인장 탭 -> 박리(3D 틸트) -> 베일을 쓰고 S 곡선으로 날아감 -> 3D 문(Spring) -> 박쥐 떼 -> 촛불 빛 -> 디졸브. 키보드 가능, 탭 시 오디오 모듈 호출 |
| `AmbientCanvas.svelte` | idle | 캔버스 1장: 안개, 불씨, 달 앞을 지나는 박쥐. 숨김/화면 밖 정지, 저사양 자동 감량 |
| `CoverHero.svelte` | load | 금빛 잉크로 쓰이는 이름, 달 상승 + 스크롤 패럴랙스, 촛불 스프링 일렁임, 날짜 카운트업 |
| `CalendarDday.svelte` | idle | 날짜 칸 캐스케이드, 31일 잭오랜턴, 플립카드 D-day(KST) |
| `Reveal.svelte` | idle | `data-reveal` 값(wipe, blur, rise, line)으로 섹션별 등장 효과 선택 |
| `Gallery.svelte` | idle | 플레이스홀더 틸트/쉬머, 사진이 있으면 FLIP 라이트박스(스와이프, 핀치, 관성, 방향키, Esc) |
| `MapChooser.svelte` | visible | 길찾기 바텀시트(Spring, 드래그 닫기, 포커스 트랩). 플랫폼별 딥링크는 `src/lib/maps.ts`, UA 판별은 `src/lib/platform.ts`, 검증은 `node scripts/maps.check.mjs`. JS 가 꺼지면 웹 링크 3개 |
| `KakaoMap.svelte` | visible | 카카오맵 임베드(JS SDK 지연 로드, `autoload=false` + `kakao.maps.load`). 기본은 이동/줌 잠금, `지도 이동` 토글로 해제(페이지 스크롤 가로채기 방지). 8초 안에 타일이 안 뜨거나 SDK 오류면 주소 카드 + `카카오맵에서 보기` 링크로 대체. JS 가 꺼지면 서버 HTML 의 주소 카드 |
| `Guestbook.svelte` | visible | 축하 글: 최신 5개 + 더보기(IntersectionObserver 무한 스크롤, 커서 페이지), 접기(로드된 앞 5개, 재요청 없음), 작성/비밀번호 삭제, 스켈레톤/빈 상태/오류 재시도. API 는 `guestbook/`(Cloudflare Worker + D1, 별도 패키지)이고 주소는 `wedding.guestbookApi`(비면 섹션 숨김). 메시지는 줄바꿈을 허용한다(서버가 `\r\n`→`\n`, 빈 줄은 최대 1줄로 정리). 그 밖의 제어문자는 거부. 모든 글은 텍스트로만 렌더링 |
| `ActionButtons.svelte` | idle | 복사/카카오 공유 버튼: 리플, 스프링 토스트 "복사됨", 공유 시 불씨 폭죽 |

- 모션 감소(`prefers-reduced-motion`): 모든 연출이 즉시 정적 상태로 바뀌고 rAF 루프는 돌지 않는다.
- 인트로는 JS 가 있을 때만 보인다(`<html class="js gated">` 를 head 인라인 스크립트가 붙이고, 4.5초 안에 섬이 못 뜨면 스스로 걷어낸다).
- 공유 상태(`src/lib/stage.svelte.ts`)로 인트로가 끝난 뒤에야 본문 연출이 시작된다.

## 개발

```sh
corepack pnpm install
corepack pnpm dev      # http://localhost:4321/wedding/
corepack pnpm build    # astro check + astro build -> dist/
```

## 내용 수정

모든 문구와 값은 `src/data/wedding.ts` 한 곳에서 읽는다.

- 홀 이름: `venue.hall` (비어 있으면 표시 안 함)
- 인사말: `greeting` (TODO 표시된 문구 교체)
- 계좌: `accounts.groom` / `accounts.bride` 에 `{ label, bank, number, holder }` 추가. 둘 다 비면 섹션이 렌더링되지 않는다.
- 축하 글 API: `guestbookApi` (Worker URL). 비면 섹션 숨김. 서버는 `guestbook/` 참고(루트 빌드/CI 와 무관, `tsconfig` 에서 제외)
- 참석 여부: `rsvpUrl` 에 구글폼 URL. 비면 섹션 숨김.
- 날짜/시간: `date`, `time` (달력, D-day, 공유 문구 제외 전부 자동 반영)
- 공유 문구: `share` (카카오 공유 제목/설명)

## 사진

`src/assets/photos/` 에 `jpg/png/webp` 를 넣으면 파일명 순으로 자동 사용된다.
첫 장은 커버, 전체는 3열 갤러리와 라이트박스(FLIP 확대, 스와이프, 핀치, 방향키, Esc)에 쓰인다.
사진이 없으면 9칸 플레이스홀더가 표시되고 라이트박스는 꺼진다. 빌드 시 webp 반응형으로 변환된다.

## 배경음악

1. `public/audio/bgm.mp3` 로 파일을 둔다. (없으면 음소거 버튼도 숨겨지고 재생은 no-op)
2. 같은 폴더에 `LICENSE.txt` 로 출처를 적는다. 예: `Music: generated with Suno (plan/track id)`
3. `src/data/wedding.ts` 의 `musicCredit` 을 맞춘다. 트랙이 있을 때만 푸터에 표시된다.

동작: 인트로 탭 시 2초 페이드인, 플로팅 토글(aria-label), 상태는 sessionStorage, 탭이 숨겨지면 일시정지 후 복귀 시 재개.

## 카카오톡 공유

- JavaScript 키는 `src/data/wedding.ts` 의 `kakaoJsKey` (공개 키, 커밋 가능). REST/네이티브 키는 절대 쓰지 않는다.
- Kakao Developers 앱 설정 > 플랫폼 > Web 에 `https://teddko.github.io` 도메인 등록 필요.
- SDK 버전과 SRI 해시는 `src/components/ActionButtons.svelte` 에 고정되어 있다. 버전을 올리면 해시도 다시 계산한다.
  `curl -s https://t1.kakaocdn.net/kakao_js_sdk/<ver>/kakao.min.js | openssl dgst -sha384 -binary | openssl base64 -A`

## 카카오맵 (오시는 길 지도)

- 같은 JavaScript 키(`kakaoJsKey`)를 쓴다. 로더: `https://dapi.kakao.com/v2/maps/sdk.js?appkey=<JS 키>&autoload=false` 후 `kakao.maps.load(cb)`. 공식 가이드(apis.map.kakao.com/web/guide)는 `//dapi.kakao.com/v2/maps/sdk.js?appkey=...` 형식이고 `libraries` 는 선택(지도만 쓰므로 생략). `autoload=false` 는 SDK 자체 코드에 구현되어 있다.
- Kakao Developers 콘솔 설정(둘 다 필요):
  1. [앱] > [플랫폼 키] > [JavaScript 키] > [JavaScript SDK 도메인] 에 `https://teddko.github.io` 등록. 미등록 도메인에서는 지도가 뜨지 않고 앱은 대체 카드로 전환된다.
  2. [제품 설정] > [카카오맵] > [사용 설정] 의 [상태] 를 ON. (2024-12 도입. 공식 문서 developers.kakao.com/docs/ko/kakaomap/common 의 사용 방법에 명시. 이후 별도 신청/심사 없이 첫 활성화 앱은 무료 쿼터 안에서 즉시 사용, 두 번째 앱부터 또는 쿼터 초과 시 비즈월렛 연결 필요.)

## 배포

`.github/workflows/deploy.yml` (main push 시 GitHub Pages). 아직 원격 저장소 없음.
`noindex,nofollow` 메타가 들어 있어 검색엔진에 노출되지 않는다.
