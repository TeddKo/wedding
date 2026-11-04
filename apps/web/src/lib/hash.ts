/** 섹션 id 의 결정적 7자리 16진 해시(FNV-1a 32bit). dev 테마 커밋 해시 장식용 */
export function fnv7(s: string): string {
  let h = 0x811c9dc5;
  for (const c of s) {
    h ^= c.codePointAt(0)!;
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0").slice(0, 7);
}
