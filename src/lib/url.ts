const base = import.meta.env.BASE_URL.replace(/\/$/, "");
/** base 경로를 반영한 내부 URL */
export const url = (path: string) => `${base}/${path.replace(/^\//, "")}`;
