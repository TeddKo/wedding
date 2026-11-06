# wedding-guestbook

Cloudflare Worker 백엔드 (방명록, 하객 스냅샷, 투표). Hono 4 + Drizzle ORM(D1) + R2. 주소는 웹 빌드 변수 `PUBLIC_API_URL` 로 관리

## 구조

```
src/index.ts      진입점 (fetch = Hono app, scheduled = 크론)
src/app.ts        미들웨어 체인(secureHeaders, CORS, no-store), 라우트 결합, 404·오류 처리
src/routes/       요청 파싱·검증·응답 (entries, photos, images, poll, auth)
src/services/     D1 + R2 조합 처리 (사진 업로드·확정·삭제, 투표)
src/repo/         Drizzle 쿼리 함수 (테이블별)
src/db/schema.ts  Drizzle 스키마, migrations/*.sql 과 동일 구조
src/domain/       순수 로직 (비밀번호 해시·HMAC, 이미지 형식·치수 판별)
src/adapters/     카카오 API 호출 (5초 타임아웃)
src/limits.ts     한도 상수
```

- 계층 방향: routes → services → repo, domain 은 어디서든 사용. 의존성 주입은 `c.env` 인자 전달로 한정
- 요청 검증은 `@wedding/shared/schemas` 의 zod 스키마 공유. 알 수 없는 키는 버림
- DDL 기준은 `migrations/*.sql`(wrangler 적용). Drizzle 스키마는 쿼리용 미러, drizzle-kit 미사용
- 오류는 `AppError` → `{error}` 응답. 예상 외 예외는 `500 server error` 와 cf-ray·경로·오류 이름만 로그

## 공통 응답 규칙

- CORS 는 `https://teddko.github.io` 정확 일치만 허용(자격 증명 없음, `Vary: Origin`)
- 응답은 `application/json; charset=utf-8`, `Cache-Control: no-store` (이미지 제외). 오류 본문은 `{error}`
- JSON 요청은 `Content-Type: application/json` 필수, 본문 4KB 상한(스트리밍 중 초과 즉시 거부)
- 평문 저장이라 출력 이스케이프는 클라이언트 책임(웹은 텍스트 바인딩만 사용)
- 그 외 경로 `404`, 메서드 불일치 `405`

## 엔드포인트

| 메서드 경로 | 설명 | 응답 |
|---|---|---|
| `GET /entries?cursor=&limit=` | 방명록 최신순 (`id < cursor`, limit 기본 10, 최대 30) | `200 {items,nextCursor}`, 마지막이면 `nextCursor:null` |
| `POST /entries` | `{name,message,password}` | `201` / `400` / `429` |
| `DELETE /entries/:id` | `{password}` | `204` / `403` / `404` / `429` |
| `PUT /photos/:uuid/:kind` | 업로드 (`kind` = `full`/`thumb`, 헤더 `X-Device`·`Content-Length` 필수) | `204` / `400` / `403 full` 총량 초과 / `409` / `413` / `415` / `422` / `429` |
| `POST /photos/:uuid/commit` | `{pw?}` 업로드 확정 (업로드한 기기만) | `201 {id,uuid,w,h,created_at,ext,locked,thumb,full}` (재호출은 `200`) / `403` 다른 기기 / `409` 업로드 미완 |
| `GET /photos?cursor=&limit=` | 숨김 제외 최신순, 항목에 `ext`, 첫 페이지만 `total` | `200` |
| `GET /photos/quota` | `X-Device` 기준 최근 10분 남은 업로드 수 | `200 {left}`, 기기 헤더 없으면 `400` |
| `GET /p/:uuid/:kind` | 이미지 (immutable 캐시, 정규 경로만 허용) | `200` / `404` |
| `DELETE /photos/:uuid` | `{pw}` 또는 관리자 토큰, `?hide=1` 은 숨김 처리 | `204` / `400` / `403` / `404` / `429` |
| `POST /auth/kakao` | `{code,redirectUri}` 카카오 로그인 | `200 {token}` / `400` / `401` / `429` / `502` |
| `POST /auth/device` | `VOTE_MODE=device` 일 때만 사용하는 기기 키 방식 | 그 외 `404` |
| `GET /poll` | `{mode,options:[{id,text,votes,mine}],total,myVote}` | `200` |
| `POST /poll/options` | `{text}` (세션 토큰 필요) | `201` / `409` / `429` |
| `POST /poll/vote` | `{optionId}` (세션 토큰 필요) | `200` / `409 {error:"already"}` / `404` |
| `DELETE /poll/options/:id` | 관리자 토큰, `hidden=1` 처리 | `204` |

세션 토큰은 `Authorization: Bearer <토큰>` (HMAC 서명, 30일). 토큰 없음, 위조, 만료는 `401`.

## 데이터 모델 (D1 `wedding-guestbook`, 마이그레이션 `migrations/`)

| 테이블 | 내용 | 마이그레이션 |
|---|---|---|
| `entries` | 방명록 (이름, 메시지, 비밀번호 해시와 salt, IP 해시) | 0001 |
| `photos` | 확정된 스냅샷 (uuid, ext, w, h, 비밀번호 해시, 기기 ID, `hidden`) | 0002 |
| `poll_options` / `poll_votes` | 투표 항목과 표 (유권자 키는 해시만 저장) | 0003 |
| `uploads` / `pw_fails` | 업로드 진행 기록, 비밀번호 실패·카카오 시도 기록 | 0004 |
| 인덱스 `photos_visible(hidden, id)` | 사진 목록 페이징·집계 커버링 | 0005 |

- R2 `BUCKET` = `wedding-snapshots`. 객체 키는 `full/<uuid>.<ext>`, `thumb/<uuid>.<ext>`, 업로드 시 `Cache-Control: public, max-age=31536000, immutable`
- 프런트는 R2 공개 주소(r2.dev, 빌드 변수 `PUBLIC_SNAPSHOTS_CDN`)에서 직접 로드, 실패 시 `/p/:uuid/:kind` 로 재시도
- 숨김과 삭제는 R2 객체를 지우지만 브라우저 캐시에는 남을 수 있음
- 비밀번호 저장: `salt` 컬럼에 `p1$<반복 횟수>$<salt>` 형식. `HMAC(PW_PEPPER, 비밀번호)` 후 PBKDF2-SHA256 5,000회. `p1$` 접두가 없는 이전 행은 pepper 없이 100,000회로 검증

## 제한

| 대상 | 규칙 |
|---|---|
| 방명록 | trim 후 name 1~20자, message 1~300자, password 4~64자. 제어문자 금지(message 의 줄바꿈 허용, 서버가 `\r\n` 을 `\n` 으로 정리) |
| 사진 파일 | `full` 3MB, 긴 변 2560px / `thumb` 200KB, 긴 변 480px (오차 +2px). JPEG, WebP 만 허용. 치수는 서버가 헤더(JPEG SOF0/1/2, WebP VP8/VP8L/VP8X)에서 직접 읽음, JPEG 세그먼트 512개 상한 |
| 사진 총량 | 누적 업로드 2,500건(`PHOTO_TOTAL_N`, R2 무료 10GB 보호). 초과 시 `403 full` |
| 투표 항목 | 원문 120자 상한 후 NFKC 정규화와 공백 정리, 1~30자, 제어문자와 보이지 않는 서식 문자 금지. 최대 20개, 1인 2개, 중복 금지 (`full`, `limit`, `duplicate`) |
| 투표 | 1인 1표, 변경 불가 |

## 레이트 리밋 (IP 는 해시, IPv6 는 /64 단위, 예식장 와이파이 공유 IP 고려)

- 방명록 작성: IP당 10분 20건
- 사진 업로드: IP당 10분 400건, 기기당 10분 20건(`PHOTO.perBatch`, 한 번에 올리는 최대 장수와 동일; uuid 첫 PUT 시점에 `uploads` 행 기록 후 검사)
- 비밀번호 오답(방명록·사진 삭제): IP당 10분 10회 초과 시 `429`. 시도 선기록 후 집계(동시 요청 우회 차단), 잠금 중에는 쓰기 없이 거부, 정답 시 시도 기록 해제
- 카카오 로그인: IP당 10분 60회, 성공·카카오 장애(502) 시도는 미집계
- 투표 항목 추가: IP당 10분 10건

## 삭제 규칙

- 방명록: 작성 시 정한 비밀번호 일치 필요
- 스냅샷
  - 비밀번호를 정한 사진: 항상 비밀번호 필요(기기 무관)
  - 비밀번호 없는 사진: 업로드한 기기(`X-Device` 일치)에서만 가능
  - 관리자(`Authorization: Bearer <ADMIN_TOKEN>`): 항상 가능. `?hide=1` 은 R2 객체만 삭제하고 D1 행은 `hidden=1` 로 유지
- 투표 항목: 관리자만 숨김 가능

## 보안

- 응답 헤더: HSTS, CSP `default-src 'none'; frame-ancestors 'none'; sandbox`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, Permissions-Policy, CORP `cross-origin`
- 비교: 관리자 토큰·기기 ID 는 SHA-256 다이제스트 상수 시간 비교, 세션 토큰은 `crypto.subtle.verify`
- 키: HMAC·PBKDF2 키는 요청마다 추출 불가 `CryptoKey` 로 생성, 모듈 전역에 요청·사용자 데이터 보관 금지
- SQL: Drizzle 빌더와 바인딩만 사용, `sql.raw` 0건
- 이미지: 매직 바이트로 판별한 JPEG/WebP 만 허용 목록 Content-Type 으로 응답, `/p` 는 정규 경로 외 404(캐시 우회 방지)
- 카카오: 고정 호스트만 호출, Redirect URI 허용 목록, 카카오 토큰 즉시 폐기
- 로그: Workers 호출 로그(`invocation_logs`) 비활성화로 요청 헤더·IP 미수집, 오류 로그는 cf-ray·경로·오류 이름만
- 금지 미들웨어(Hono 보안 공지 대상): serveStatic, ipRestriction, jwt/jwk, cache, bodyLimit, csrf, app.mount 등. 권한 검사는 경로 미들웨어가 아닌 핸들러 안에서 수행
- 버전 고정: hono 4.13.16, drizzle-orm 0.45.4, zod 4.6.7(보안 패치 포함)

## 무료 플랜 예산

하객 200명, 사진 1,000장 기준 당일 추정과 2026-11-04 운영 실측.

| 자원 | 무료 한도 | 당일 추정 | 근거·조치 |
|---|---|---|---|
| Worker 요청 | 100k/일 | 약 15~25k | 이미지 r2.dev 직접 로드, 투표 45초 갱신 |
| Worker CPU | 요청당 10ms | 조회 2~4ms, 방명록 작성 7.5ms, 삭제 13.5ms(중앙값) | 비밀번호 해시 5,000회 + pepper. 가끔 초과는 Cloudflare 허용 범위 |
| D1 읽기 | 5M 행/일 | 약 1.3M | `photos_visible` 인덱스, 투표 커버링 집계, 총량 검사는 `max(rowid)` 1행 |
| D1 쓰기 | 100k 행/일 | 약 16k | 잠금 중 쓰기 차단 |
| R2 저장 | 10GB | 최대 약 8GB | 누적 2,500건 상한 |
| R2 작업 | A 1M·B 10M/월 | 1% 미만 | |

- Cache API 는 `*.workers.dev` 에서 동작하지 않으므로 이미지 절감은 r2.dev 로 처리
- 실측 방법: `wrangler tail --format json` 의 `cpuTime`, 대시보드 Workers·D1 지표

## 카카오 로그인 흐름

1. 프런트가 카카오 JS SDK `Kakao.Auth.authorize` 로 리다이렉트 (복귀 주소 `https://teddko.github.io/wedding/`, `ALLOW_LOCAL` 일 때만 `http://localhost:<port>/wedding/` 도 허용)
2. 복귀 후 `POST /auth/kakao {code,redirectUri}` 호출
3. 서버가 `KAKAO_REST_KEY` + `KAKAO_CLIENT_SECRET` 으로 코드 교환 후 `access_token_info` 로 카카오 id 조회, 카카오 토큰은 즉시 폐기
4. 저장 키는 `HMAC(VOTER_PEPPER, "kakao:" + id)` 뿐. 응답은 서명된 세션 토큰(30일)
5. `VOTE_MODE=device` 는 로그인 없이 기기별 랜덤 키를 쓰는 약한 대체 수단. 운영 기본값 아님

## 크론

`scheduled` 핸들러(`17 * * * *`, 매시 17분)가 24시간 넘게 커밋되지 않은 업로드의 R2 객체와 `uploads` 행을 정리 (회당 최대 500건). 사진 삭제 시 `uploads` 행도 함께 삭제.

## 로컬 개발과 테스트

```sh
cp .dev.vars.example .dev.vars   # 가짜 값 입력, gitignore 대상
pnpm dev            # wrangler dev --local --env dev
pnpm test           # vitest run (Workers 런타임 + 로컬 D1/R2)
pnpm typecheck      # tsc --noEmit
```

- `test/*.test.ts` 는 `@cloudflare/vitest-plugin` 으로 Workers 런타임에서 실행(엔드포인트 계약, 레이트 리밋, CORS, 사진, 투표, 카카오 교환, 보안 회귀, 사진 총량)
- 카카오 응답은 `fetch` 스파이로 모의, 투표 테스트는 `VOTE_MODE=device` 바인딩 사용
- `[env.dev]` 는 로컬 전용(`wedding-guestbook-dev` D1, `wedding-snapshots-dev` R2, 자리표시 id). 운영 리소스 접근 불가, 원격 배포에 사용 금지
- `ALLOW_LOCAL` 은 `[env.dev]` 에만 존재하고 운영에는 없음

## 배포

```sh
pnpm install
wrangler d1 migrations apply wedding-guestbook --remote
wrangler deploy
```

시크릿(이름만 기록, 값은 저장소 금지, `wrangler secret put <이름>` 으로 등록)

| 이름 | 용도 | 변경 시 영향 |
|---|---|---|
| `IP_PEPPER` | IP 해시 | 기존 레이트 리밋 기록 무효화 |
| `PW_PEPPER` | 비밀번호 해시 선처리(누락 시 해시 경로 500) | `p1$` 형식 기존 비밀번호 전부 검증 불가 |
| `VOTER_PEPPER` | 투표 키 해시 | 기존 투표자 식별 단절 |
| `SESSION_SECRET` | 세션 토큰 서명 | 전원 재로그인 |
| `KAKAO_REST_KEY` | 카카오 코드 교환 | 로그인 불가 |
| `KAKAO_CLIENT_SECRET` | 카카오 코드 교환 | 로그인 불가 |
| `ADMIN_TOKEN` | 관리자 삭제 및 숨김 | 키체인 서비스 `wedding-admin-token` 에 보관 |

- 변수 `VOTE_MODE`: 비움이면 카카오 로그인, `device` 면 기기 키 방식
- 난수형 시크릿 생성 예: `openssl rand -base64 32 | wrangler secret put IP_PEPPER`
- `keep_vars = true` 라 대시보드 변수 유지
- 스키마 변경 시 마이그레이션을 원격에 먼저 적용한 뒤 배포. 프런트는 그 다음 `main` push
- 롤백: `wrangler deployments list` 로 버전 확인 후 `wrangler rollback <버전 ID>`. 마이그레이션은 이전 버전과 호환되게 작성
- R2 공개 주소: `wrangler r2 bucket dev-url get wedding-snapshots`

## 운영 작업

```sh
# 방명록 개별 삭제
wrangler d1 execute wedding-guestbook --remote --command "DELETE FROM entries WHERE id=123"
# 백업
wrangler d1 export wedding-guestbook --remote --output backup.sql
```

- 백업 파일에 pw_hash, salt, ip_hash 포함. 공개 저장소 업로드 금지
