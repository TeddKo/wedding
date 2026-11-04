export interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  ADMIN_TOKEN?: string;
  IP_PEPPER: string;
  ALLOW_LOCAL?: string;
  VOTE_MODE?: string;
  VOTER_PEPPER?: string;
  SESSION_SECRET?: string;
  KAKAO_REST_KEY?: string;
  KAKAO_CLIENT_SECRET?: string;
  ORPHAN_MS?: string;
}

export type AppEnv = { Bindings: Env };
