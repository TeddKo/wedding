import type { Os } from "./platform";

export interface Venue {
  name: string;
  query: string;
  lat: number;
  lng: number;
}
export interface MapApp {
  id: "kakao" | "naver" | "tmap" | "google" | "apple";
  name: string;
  hint: string;
  /** 클릭 시 이동할 주소 (앱 스킴, intent 또는 웹) */
  href: string;
  /** 있으면 href 가 스킴이므로 1.5초 안에 앱이 안 뜨면 이 주소로 이동 */
  fallback?: string;
  blank?: boolean;
}

const APPNAME = "teddko.github.io%2Fwedding";
const WEB_HINT = "앱이 없으면 웹에서 열려요";
const intent = (rest: string, scheme: string, pkg: string, fallback: string, extra = "") =>
  `intent://${rest}#Intent;scheme=${scheme};${extra}package=${pkg};S.browser_fallback_url=${encodeURIComponent(fallback)};end`;

export function mapApps(os: Os, mac: boolean, v: Venue): MapApp[] {
  const n = encodeURIComponent(v.name);
  const { lat: L, lng: G } = v;
  const kakaoWeb = `https://map.kakao.com/link/to/${n},${L},${G}`;
  const naverWeb = `https://map.naver.com/p/search/${encodeURIComponent(v.query)}`;
  const naverQ = `route/car?dlat=${L}&dlng=${G}&dname=${n}&appname=${APPNAME}`;
  const naverX = "action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;";
  // 티맵: 공식 문서에 URL 스킴이 없다. 커뮤니티 확인 값(goalx=경도, goaly=위도)이므로 실기기 검증 필요
  const tmapQ = `route?goalname=${n}&goalx=${G}&goaly=${L}`;
  const tmapPlay = "https://play.google.com/store/apps/details?id=com.skt.tmap.ku";
  const tmapStore = "https://apps.apple.com/app/id431589174";
  const blank = os === "desktop" || undefined;

  const list: MapApp[] = [
    {
      id: "kakao",
      name: "카카오맵",
      hint: WEB_HINT,
      ...(os === "ios"
        ? { href: `kakaomap://look?p=${L},${G}`, fallback: kakaoWeb }
        : os === "android"
          ? { href: intent(`look?p=${L},${G}`, "kakaomap", "net.daum.android.map", kakaoWeb) }
          : { href: kakaoWeb, blank }),
    },
    {
      id: "naver",
      name: "네이버지도",
      hint: WEB_HINT,
      ...(os === "ios"
        ? { href: `nmap://${naverQ}`, fallback: naverWeb }
        : os === "android"
          ? { href: intent(naverQ, "nmap", "com.nhn.android.nmap", naverWeb, naverX) }
          : { href: naverWeb, blank }),
    },
  ];
  if (os === "ios") list.push({ id: "tmap", name: "티맵", hint: "앱 설치 필요", href: `tmap://${tmapQ}`, fallback: tmapStore });
  if (os === "android") list.push({ id: "tmap", name: "티맵", hint: "앱 설치 필요", href: intent(tmapQ, "tmap", "com.skt.tmap.ku", tmapPlay) });
  list.push({ id: "google", name: "Google 지도", hint: WEB_HINT, href: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${L},${G}`)}`, blank });
  if (os === "ios" || mac) list.push({ id: "apple", name: "Apple 지도", hint: WEB_HINT, href: `https://maps.apple.com/directions?destination=${L},${G}`, blank });
  return list;
}
