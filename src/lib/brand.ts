import { url } from "./url";

/*
 * 출처(각 사 공식 배포처, 원본 그대로 사용):
 * - kakaotalk.svg: Kakao Developers 리소스 다운로드 > 카카오톡 공유 (Kakao Talk.zip, small/SVG/kakaotalk_sharing_btn_small.svg)
 *   https://developers.kakao.com/tool/resource/talk
 * - kakao.png: Kakao Developers 리소스 다운로드 > 카카오맵 (Kakao Map.zip, kakaomap_basic.png 600px를 132px로 축소)
 *   https://developers.kakao.com/tool/resource/map
 * - naver.png: 네이버 지도 공식 웹(map.naver.com) 앱 아이콘 apple-icon-180x180.png
 *   https://ssl.pstatic.net/static/maps/assets/icons/apple-icon-180x180.png
 * - tmap.svg: TMAP 모빌리티 공식 홈페이지 심볼마크(아이콘 다운로드 페이지가 없어 사이트 자산 사용)
 *   https://www.tmapmobility.com/_next/static/media/frame-logo-symbolmark.44180326.svg
 * 상표는 각 소유자(Kakao, NAVER, TMAP Mobility) 소유. 해당 서비스로 연결하는 버튼에만 사용.
 */
export type BrandId = "kakaotalk" | "naver" | "tmap" | "kakao";

const FILE: Record<BrandId, string> = { kakaotalk: "kakaotalk.svg", naver: "naver.png", tmap: "tmap.svg", kakao: "kakao.png" };

export const brandIcon = (id: BrandId) => url(`brand/${FILE[id]}`);
