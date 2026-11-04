# wedding-guestbook

Cloudflare Worker + D1 방명록 API. URL: `https://wedding-guestbook.tddy-ko-83e.workers.dev`

CORS 는 `https://teddko.github.io` 만 허용. 응답은 항상 `application/json; charset=utf-8`, `Cache-Control: no-store`. 본문 4KB 제한. 서버는 평문 저장, 출력 이스케이프는 클라이언트 책임.

## Endpoints

- `GET /entries?cursor=<id>&limit=<n>` : 최신순, `id < cursor`. limit 기본 10, 최대 30.
  `200 { items:[{id,name,message,created_at}], nextCursor }` (마지막이면 `nextCursor:null`)
- `POST /entries` `{name,message,password}` : trim 후 name 1..20, message 1..300, password 4..64, 제어문자 불가.
  `201 {id,name,message,created_at}` / `400` 검증 실패 / `429` IP(해시, IPv6 는 /64)당 10분 5건 초과
- `DELETE /entries/:id` `{password}` : `204` 성공 / `403` 비밀번호 불일치 / `404` 없음
- 스냅샷(R2 `BUCKET` = `wedding-snapshots`, 헤더 `X-Device` 필수):
  - `PUT /photos/:uuid/:kind` (`full` 3MB·긴 변 2560px / `thumb` 200KB·긴 변 480px, 오차 +2px, JPEG·WebP 만) `204` / `400` / `409` 이미 등록 또는 같은 uuid 의 확장자 불일치 / `413` / `415` / `422` 치수 초과·헤더 해석 불가 / `429` IP 10분 200건·기기 30건(uuid 첫 PUT 시점에 `uploads` 행을 기록하고 검사). 치수는 JPEG SOF0/1/2, WebP VP8/VP8L/VP8X 헤더에서 서버가 직접 읽는다
  - `POST /photos/:uuid/commit` `{pw?}` : `201 {id,uuid,w,h,created_at,thumb,full}` (재호출·동시 호출은 `200`) / `409` 업로드 미완. w/h 는 PUT 때 서버가 읽은 값을 저장한다(본문 값은 무시)
  - 정리: `scheduled` 크론(`17 * * * *`)이 24시간 넘게 커밋되지 않은 업로드의 R2 객체와 `uploads` 행을 지운다(회당 500건). 사진 삭제 시 `uploads` 행도 지운다
  - `GET /photos?cursor=&limit=` : 숨김 제외 최신순, 항목에 `ext`(`webp`|`jpg`) 포함, 첫 페이지(cursor 없음)만 `total`. `Cache-Control: no-store`. `GET /p/:uuid/:kind` : 이미지(immutable 캐시)
  - `DELETE /photos/:uuid` `{pw}` (비밀번호 틀림은 IP 10분 10회 초과 시 `429`) 소유자 또는 `Authorization: Bearer <ADMIN_TOKEN>` (`?hide=1` 은 D1 행만 `hidden=1` 로 남기고 R2 객체는 삭제)
  - R2 공개 커스텀 도메인: 객체 키는 `full/<uuid>.<ext>` · `thumb/<uuid>.<ext>`, 업로드 시 `Cache-Control: public, max-age=31536000, immutable`. 프런트 `src/data/wedding.ts` 의 `snapshotsCdn` 에 도메인을 넣으면 `${snapshotsCdn}/${key}` 로 직접 로드한다(비우면 Worker `/p/...`).
  - 주의: 숨김·삭제는 R2 객체를 지우지만 CDN·브라우저 캐시(immutable 1년)에는 퍼지 전까지 이미지가 남을 수 있다. 급하면 Cloudflare 캐시 퍼지를 한다.
- 투표(카카오 로그인 1인 1표, 변경 불가). 인증은 `Authorization: Bearer <세션 토큰>`(HMAC 서명, 30일):
  - `POST /auth/kakao` `{code,redirectUri}` : redirectUri 는 `https://teddko.github.io/wedding/`(ALLOW_LOCAL 이면 `http://localhost:<port>/wedding/` 도) 만 허용. 서버가 `KAKAO_REST_KEY`/`KAKAO_CLIENT_SECRET` 으로 코드를 교환하고 `access_token_info` 로 id 를 얻은 뒤 토큰은 버린다. 저장되는 키는 `HMAC(VOTER_PEPPER,"kakao:"+id)` 뿐. `200 {token}` / `400` / `401` 카카오 거부 / `502` 카카오 불가
  - `POST /auth/device` : `VOTE_MODE=device` 일 때만(약한 대체 수단, 기기별 랜덤 키). 아니면 `404`
  - `GET /poll` : `{mode,options:[{id,text,votes,mine}],total,myVote}` (토큰이 있으면 mine/myVote 반영, 숨김 제외, 득표순)
  - `POST /poll/options` `{text}` (인증) : NFKC 정규화·공백 정리 후 1..30자, 제어문자·서식(보이지 않는) 문자 불가. `201 {…results,created}` / `409` `full`(최대 20) · `limit`(1인 2개) · `duplicate` / `429` IP 10분 5건
  - `POST /poll/vote` `{optionId}` (인증) : `200` 결과 / `409 {error:"already",…results}` / `404` 항목 없음
  - `DELETE /poll/options/:id` `Authorization: Bearer <ADMIN_TOKEN>` : 숨김 처리(`hidden=1`)
  - `401` 토큰 없음/위조/만료
- 그 외 경로 `404`, 메서드 불일치 `405`. 오류 본문은 `{error}`.

## Deploy

```sh
pnpm install
wrangler d1 migrations apply wedding-guestbook --remote
openssl rand -base64 32 | wrangler secret put IP_PEPPER   # 최초 1회, 커밋 금지
openssl rand -base64 32 | wrangler secret put VOTER_PEPPER    # 투표 키 해시 (바꾸면 기존 투표자 식별이 끊김)
openssl rand -base64 32 | wrangler secret put SESSION_SECRET  # 세션 토큰 서명 (바꾸면 전원 재로그인)
wrangler deploy
```

`keep_vars = true` 라 대시보드 변수는 유지된다. `ALLOW_LOCAL` 은 `[env.dev]` 에만 있고 운영에는 없다. `[env.dev]` 는 로컬 전용(`wedding-guestbook-dev` D1 · `wedding-snapshots-dev` R2, 자리표시 id)이라 운영 리소스를 건드리지 않는다. 이미 배포된 DB 는 `wrangler d1 migrations apply wedding-guestbook --remote` 로 0004 를 적용한다.

## Test

`pnpm test` : 로컬 `wrangler dev --env dev --test-scheduled` 를 임시 D1 로 띄워 fetch 로 검증 (등록/페이징/검증/삭제/레이트리밋/CORS).
로컬 개발은 `.dev.vars` (gitignore) 에 `IP_PEPPER=...` 를 둔다. 투표 테스트는 `VOTE_MODE=device` + 모의 카카오 서버(`KAKAO_MOCK`, `ALLOW_LOCAL` 일 때만 동작)를 쓴다. 운영 카카오 교환은 배포 후 수동 확인(카카오 콘솔: Redirect URI `https://teddko.github.io/wedding/` 등록, 카카오 로그인 활성화, 클라이언트 시크릿 활성화).

## 소유자 삭제

```sh
wrangler d1 execute wedding-guestbook --remote --command "DELETE FROM entries WHERE id=123"
```

## Backup

```sh
wrangler d1 export wedding-guestbook --remote --output backup.sql
```

export 파일에는 pw_hash/salt/ip_hash 가 들어 있으니 공개 저장소에 올리지 않는다.
