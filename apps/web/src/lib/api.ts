type Init = Omit<RequestInit, "headers"> & { headers?: Record<string, string>; token?: string };

/** JSON API 호출. 본문이 있으면 Content-Type 부여, 응답 본문이 JSON 이 아니면 빈 객체 */
export async function request<T = unknown>(api: string, path: string, { token, headers, ...init }: Init = {}): Promise<{ status: number; body: T }> {
  const r = await fetch(api + path, {
    ...init,
    headers: { ...(init.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
  });
  return { status: r.status, body: (await r.json().catch(() => ({}))) as T };
}
