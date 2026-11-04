declare namespace Cloudflare {
  interface Env {
    TEST_MIGRATIONS: D1Migration[];
    IP_PEPPER: string;
    PW_PEPPER: string;
    ADMIN_TOKEN: string;
    VOTE_MODE: string;
    VOTER_PEPPER: string;
    SESSION_SECRET: string;
    ORPHAN_MS: string;
    KAKAO_REST_KEY: string;
    KAKAO_CLIENT_SECRET: string;
  }
}
