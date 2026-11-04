import type { Env } from "../env";

const TIMEOUT_MS = 5000;

/** 카카오 인가 코드를 사용자 id 로 교환. 액세스 토큰은 즉시 폐기, 실패는 null, 네트워크 오류·타임아웃은 throw */
export async function kakaoId(code: string, redirectUri: string, env: Env): Promise<string | null> {
  const t = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: env.KAKAO_REST_KEY ?? "",
      redirect_uri: redirectUri,
      code,
      client_secret: env.KAKAO_CLIENT_SECRET ?? "",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const tok = t.ok ? ((await t.json()) as { access_token?: string }).access_token : null;
  if (!tok) return null;
  const i = await fetch("https://kapi.kakao.com/v1/user/access_token_info", {
    headers: { Authorization: `Bearer ${tok}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const id = i.ok ? ((await i.json()) as { id?: number | string }).id : null;
  return typeof id === "number" || typeof id === "string" ? String(id) : null;
}
