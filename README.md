# 모바일 청첩장 (Halloween gothic)

Astro 정적 사이트. 배포 주소 예정: `https://teddko.github.io/wedding/`

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
- 참석 여부: `rsvpUrl` 에 구글폼 URL. 비면 섹션 숨김.
- 날짜/시간: `date`, `time` (달력, D-day, `.ics`, 공유 문구 제외 전부 자동 반영)
- 공유 문구: `share` (카카오 공유 제목/설명)

## 사진

`src/assets/photos/` 에 `jpg/png/webp` 를 넣으면 파일명 순으로 자동 사용된다.
첫 장은 커버, 전체는 3열 갤러리와 라이트박스(스와이프, 방향키, Esc)에 쓰인다.
사진이 없으면 9칸 플레이스홀더가 표시되고 라이트박스는 꺼진다. 빌드 시 webp 반응형으로 변환된다.

## 배경음악

1. `public/audio/bgm.mp3` 로 파일을 둔다. (없으면 음소거 버튼도 숨겨지고 재생은 no-op)
2. 같은 폴더에 `LICENSE.txt` 로 출처를 적는다. 예: `Music: generated with Suno (plan/track id)`
3. `src/data/wedding.ts` 의 `musicCredit` 을 맞춘다. 트랙이 있을 때만 푸터에 표시된다.

동작: 인트로 탭 시 2초 페이드인, 플로팅 토글(aria-label), 상태는 sessionStorage, 탭이 숨겨지면 일시정지 후 복귀 시 재개.

## 카카오톡 공유

- JavaScript 키는 `src/data/wedding.ts` 의 `kakaoJsKey` (공개 키, 커밋 가능). REST/네이티브 키는 절대 쓰지 않는다.
- Kakao Developers 앱 설정 > 플랫폼 > Web 에 `https://teddko.github.io` 도메인 등록 필요.
- SDK 버전과 SRI 해시는 `src/scripts/main.ts` 에 고정되어 있다. 버전을 올리면 해시도 다시 계산한다.
  `curl -s https://t1.kakaocdn.net/kakao_js_sdk/<ver>/kakao.min.js | openssl dgst -sha384 -binary | openssl base64 -A`

## 배포

`.github/workflows/deploy.yml` (main push 시 GitHub Pages). 아직 원격 저장소 없음.
`noindex,nofollow` 메타가 들어 있어 검색엔진에 노출되지 않는다.
