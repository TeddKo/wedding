# 보안 정책

## 지원 범위

- 지원 대상: `main` 브랜치 최신 상태
- 대상 구성: `apps/web`(GitHub Pages 정적 사이트), `apps/api`(Cloudflare Worker + D1 + R2)

## 취약점 제보

- GitHub 저장소 Security 탭의 Private vulnerability reporting 으로 비공개 제보
- 공개 이슈, PR 로 취약점 내용 게시 금지
- 제보 시 재현 절차, 영향 범위, 확인한 버전(커밋) 포함

## 위협 모델 (STRIDE-lite)

| 구분 | 위협 | 대응 |
|---|---|---|
| Spoofing | 타인 명의 투표, 관리자 사칭 | 카카오 서버 측 코드 교환, 서명 세션 토큰(HMAC), 관리자 토큰 상수 시간 비교 |
| Tampering | 요청 본문 변조, 업로드 파일 위장 | 서버 측 입력 검증, 이미지 매직 바이트와 치수 서버 파싱, 바인드 쿼리 |
| Repudiation | 작성자 부인 | IP 해시 기록, 요청 로그(cf-ray, 경로, 상태) |
| Information disclosure | 비밀번호, IP 노출 | PBKDF2 해시와 솔트, IP 는 페퍼 해시만 저장, 응답에 내부 필드 미포함, 오류 본문 최소화 |
| Denial of service | 대량 작성, 업로드, 비밀번호 대입 | IP 와 기기 단위 D1 카운터 제한, 본문 4KB 상한, 이미지 크기 상한, 고아 업로드 정리 크론 |
| Elevation of privilege | 허용되지 않은 출처의 교차 호출 | CORS 허용 출처 고정(`https://teddko.github.io`), 쿠키 미사용, 로컬 허용은 dev 환경 한정 |

## 시크릿 관리

- 시크릿은 Cloudflare Worker 시크릿에만 보관, 저장소 커밋 금지
- 대상: `ADMIN_TOKEN`, `IP_PEPPER`, `VOTER_PEPPER`, `SESSION_SECRET`, `KAKAO_REST_KEY`, `KAKAO_CLIENT_SECRET`
- 로컬 개발용 값은 `.dev.vars`(gitignore) 에만 기록
- CI 에는 배포용 `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` 만 보관

## 시크릿 교체 절차

1. 새 값 생성
2. `wrangler secret put <이름>` 으로 갱신 후 Worker 재배포
3. 영향 확인
   - `SESSION_SECRET` 교체: 기존 세션 토큰 전부 무효화
   - `IP_PEPPER` 교체: 기존 IP 해시 기반 제한 카운터 초기화
   - `VOTER_PEPPER` 교체: 카카오 투표자 식별자 변경으로 기존 투표 중복 판정 불가
4. 유출 의심 시 즉시 교체, 카카오 키는 개발자 콘솔에서 재발급

## 공급망

- `pnpm install --frozen-lockfile` 단일 잠금 파일 사용
- CI 에서 `pnpm audit --audit-level high` 실행
- Dependabot 주간 갱신, 14일 쿨다운
- GitHub Actions 는 커밋 SHA 고정, 기본 권한 `contents: read`
