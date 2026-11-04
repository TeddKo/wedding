# wedding-guestbook

Cloudflare Worker + D1 + R2 백엔드 (방명록, 하객 스냅샷, 투표). 주소: `https://wedding-guestbook.tddy-ko-83e.workers.dev`

- CORS 는 `https://teddko.github.io` 만 허용
- 응답은 `application/json; charset=utf-8`, `Cache-Control: no-store` (이미지 제외). 오류 본문은 `{error}`
- 요청 본문 4KB 제한. 평문 저장이라 출력 이스케이프는 클라이언트 책임
- 그 외 경로 `404`, 메서드 불일치 `405`

## 엔드포인트

| 메서드 경로 | 설명 | 응답 |
|---|---|---|
| `GET /entries?cursor=&limit=` | 방명록 최신순 (`id < cursor`, limit 기본 10, 최대 30) | `200 {items,nextCursor}`, 마지막이면 `nextCursor:null` |
| `POST /entries` | `{name,message,password}` | `201` / `400` / `429` |
| `DELETE /entries/:id` | `{password}` | `204` / `403` / `404` |
| `PUT /photos/:uuid/:kind` | 업로드 (`kind` = `full`/`thumb`, 헤더 `X-Device` 필수) | `204` / `400` / `409` / `413` / `415` / `422` / `429` |
| `POST /photos/:uuid/commit` | `{pw?}` 업로드 확정 | `201 {id,uuid,w,h,created_at,thumb,full}` (재호출은 `200`) / `409` 업로드 미완 |
| `GET /photos?cursor=&limit=` | 숨김 제외 최신순, 항목에 `ext`, 첫 페이지만 `total` | `200` |
| `GET /p/:uuid/:kind` | 이미지 (immutable 캐시) | `200` |
| `DELETE /photos/:uuid` | `{pw}` 또는 관리자 토큰, `?hide=1` 은 숨김 처리 | `204` / `400` / `403` / `404` / `429` |
| `POST /auth/kakao` | `{code,redirectUri}` 카카오 로그인 | `200 {token}` / `400` / `401` / `502` |
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
| `uploads` / `pw_fails` | 업로드 진행 기록, 삭제 비밀번호 실패 기록 | 0004 |

- R2 `BUCKET` = `wedding-snapshots`. 객체 키는 `full/<uuid>.<ext>`, `thumb/<uuid>.<ext>`, 업로드 시 `Cache-Control: public, max-age=31536000, immutable`
- 커스텀 도메인을 연결하면 프런트 `snapshotsCdn` 설정으로 직접 로드. 숨김과 삭제는 R2 객체를 지우지만 CDN과 브라우저 캐시에는 퍼지 전까지 남을 수 있음

## 제한

| 대상 | 규칙 |
|---|---|
| 방명록 | trim 후 name 1~20자, message 1~300자, password 4~64자. 제어문자 금지(message 의 줄바꿈 허용, 서버가 `\r\n` 을 `\n` 으로 정리) |
| 사진 파일 | `full` 3MB, 긴 변 2560px / `thumb` 200KB, 긴 변 480px (오차 +2px). JPEG, WebP 만 허용. 치수는 서버가 헤더(JPEG SOF0/1/2, WebP VP8/VP8L/VP8X)에서 직접 읽음 |
| 투표 항목 | NFKC 정규화와 공백 정리 후 1~30자, 제어문자와 보이지 않는 서식 문자 금지. 최대 20개, 1인 2개, 중복 금지 (`full`, `limit`, `duplicate`) |
| 투표 | 1인 1표, 변경 불가 |

## 레이트 리밋 (IP 는 해시, IPv6 는 /64 단위)

- 방명록 작성: IP당 10분 5건
- 사진 업로드: IP당 10분 200건, 기기당 30건 (uuid 첫 PUT 시점에 `uploads` 행 기록 후 검사)
- 삭제 비밀번호 오답: IP당 10분 10회 초과 시 `429`
- 투표 항목 추가: IP당 10분 5건

## 삭제 규칙

- 방명록: 작성 시 정한 비밀번호 일치 필요
- 스냅샷
  - 비밀번호를 정한 사진: 항상 비밀번호 필요(기기 무관)
  - 비밀번호 없는 사진: 업로드한 기기(`X-Device` 일치)에서만 가능
  - 관리자(`Authorization: Bearer <ADMIN_TOKEN>`): 항상 가능. `?hide=1` 은 R2 객체만 삭제하고 D1 행은 `hidden=1` 로 유지
- 투표 항목: 관리자만 숨김 가능

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
pnpm install
pnpm dev            # wrangler dev --local --env dev
pnpm test           # vitest run (Workers 런타임 + 로컬 D1/R2)
```

- `test/*.test.ts` 는 `@cloudflare/vitest-plugin` 으로 Workers 런타임에서 실행하며 로컬 D1/R2 사용(등록, 페이징, 검증, 삭제, 레이트 리밋, CORS, 사진, 투표, 카카오 교환)
- 로컬 시크릿은 `.dev.vars` (gitignore) 에 `IP_PEPPER=...` 기록
- 투표 테스트는 `VOTE_MODE=device` 바인딩과 `fetch` 스파이로 모의한 카카오 응답 사용
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
| `VOTER_PEPPER` | 투표 키 해시 | 기존 투표자 식별 단절 |
| `SESSION_SECRET` | 세션 토큰 서명 | 전원 재로그인 |
| `KAKAO_REST_KEY` | 카카오 코드 교환 | 로그인 불가 |
| `KAKAO_CLIENT_SECRET` | 카카오 코드 교환 | 로그인 불가 |
| `ADMIN_TOKEN` | 관리자 삭제 및 숨김 | 키체인 서비스 `wedding-admin-token` 에 보관 |

- 변수 `VOTE_MODE`: 비움이면 카카오 로그인, `device` 면 기기 키 방식
- 난수형 시크릿 생성 예: `openssl rand -base64 32 | wrangler secret put IP_PEPPER`
- `keep_vars = true` 라 대시보드 변수 유지
- 스키마 변경 시 마이그레이션을 원격에 먼저 적용한 뒤 배포. 프런트는 그 다음 `main` push

## 운영 작업

```sh
# 방명록 개별 삭제
wrangler d1 execute wedding-guestbook --remote --command "DELETE FROM entries WHERE id=123"
# 백업
wrangler d1 export wedding-guestbook --remote --output backup.sql
```

- 백업 파일에 pw_hash, salt, ip_hash 포함. 공개 저장소 업로드 금지
