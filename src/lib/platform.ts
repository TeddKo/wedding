export type Os = "ios" | "android" | "desktop";
export interface Platform {
  os: Os;
  /** macOS 데스크톱 (Apple 지도 노출용) */
  mac: boolean;
  /** 카카오톡 인앱 브라우저 */
  kakao: boolean;
}

/** UA 기반 단순 판별. iPadOS 는 Mac UA + 터치 포인트로 iOS 취급 */
export function detect(ua: string, touchPoints = 0): Platform {
  const macUa = /Macintosh/.test(ua);
  const ios = /iPhone|iPad|iPod/.test(ua) || (macUa && touchPoints > 1);
  const android = !ios && /Android/.test(ua);
  return { os: ios ? "ios" : android ? "android" : "desktop", mac: macUa && !ios, kakao: /KAKAOTALK/i.test(ua) };
}
