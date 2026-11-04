# wedding-guestbook

Cloudflare Worker + D1 방명록 API. URL: `https://wedding-guestbook.tddy-ko-83e.workers.dev`

CORS 는 `https://teddko.github.io` 만 허용. 응답은 항상 `application/json; charset=utf-8`, `Cache-Control: no-store`. 본문 4KB 제한. 서버는 평문 저장, 출력 이스케이프는 클라이언트 책임.

## Endpoints

- `GET /entries?cursor=<id>&limit=<n>` : 최신순, `id < cursor`. limit 기본 10, 최대 30.
  `200 { items:[{id,name,message,created_at}], nextCursor }` (마지막이면 `nextCursor:null`)
- `POST /entries` `{name,message,password}` : trim 후 name 1..20, message 1..300, password 4..64, 제어문자 불가.
  `201 {id,name,message,created_at}` / `400` 검증 실패 / `429` IP(해시)당 10분 5건 초과
- `DELETE /entries/:id` `{password}` : `204` 성공 / `403` 비밀번호 불일치 / `404` 없음
- 스냅샷(R2 `BUCKET` = `wedding-snapshots`, 헤더 `X-Device` 필수):
  - `PUT /photos/:uuid/:kind` (`full` 3MB / `thumb` 200KB, JPEG·WebP 만) `204` / `400` / `409` 이미 등록 / `413` / `415`
  - `POST /photos/:uuid/commit` `{w,h,size,pw?}` : `201 {id,uuid,w,h,created_at,thumb,full}` (재호출 `200`) / `409` 업로드 미완 / `429` IP 10분 40장·평생 60장·기기 30장
  - `GET /photos?cursor=&limit=` : 숨김 제외 최신순, 항목에 `ext`(`webp`|`jpg`) 포함, 첫 페이지(cursor 없음)만 `total`. `Cache-Control: no-store`. `GET /p/:uuid/:kind` : 이미지(immutable 캐시)
  - `DELETE /photos/:uuid` `{pw}` 소유자 또는 `Authorization: Bearer <ADMIN_TOKEN>` (`?hide=1` 은 D1 행만 `hidden=1` 로 남기고 R2 객체는 삭제)
  - R2 공개 커스텀 도메인: 객체 키는 `full/<uuid>.<ext>` · `thumb/<uuid>.<ext>`, 업로드 시 `Cache-Control: public, max-age=31536000, immutable`. 프런트 `src/data/wedding.ts` 의 `snapshotsCdn` 에 도메인을 넣으면 `${snapshotsCdn}/${key}` 로 직접 로드한다(비우면 Worker `/p/...`).
  - 주의: 숨김·삭제는 R2 객체를 지우지만 CDN·브라우저 캐시(immutable 1년)에는 퍼지 전까지 이미지가 남을 수 있다. 급하면 Cloudflare 캐시 퍼지를 한다.
- 그 외 경로 `404`, 메서드 불일치 `405`. 오류 본문은 `{error}`.

## Deploy

```sh
pnpm install
wrangler d1 migrations apply wedding-guestbook --remote
openssl rand -base64 32 | wrangler secret put IP_PEPPER   # 최초 1회, 커밋 금지
wrangler deploy
```

`keep_vars = true` 라 대시보드 변수는 유지된다. `ALLOW_LOCAL` 은 `[env.dev]` 에만 있고 운영에는 없다.

## Test

`pnpm test` : 로컬 `wrangler dev --env dev` 를 임시 D1 로 띄워 fetch 로 검증 (등록/페이징/검증/삭제/레이트리밋/CORS).
로컬 개발은 `.dev.vars` (gitignore) 에 `IP_PEPPER=...` 를 둔다.

## 소유자 삭제

```sh
wrangler d1 execute wedding-guestbook --remote --command "DELETE FROM entries WHERE id=123"
```

## Backup

```sh
wrangler d1 export wedding-guestbook --remote --output backup.sql
```

export 파일에는 pw_hash/salt/ip_hash 가 들어 있으니 공개 저장소에 올리지 않는다.
