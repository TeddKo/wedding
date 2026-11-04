/** puppy 테마 손그림 SVG 문자열: 발바닥, 테니스공, 뼈다귀. 액센트 #b27085. */

export const PUPPY_ACCENT = "#9a6b6b";

/** 발바닥 도형(24x24 좌표계, 위쪽이 발가락) */
export const pawShapes =
  '<ellipse cx="12" cy="16.500" rx="5.800" ry="4.600"/><ellipse cx="4.800" cy="11" rx="2.200" ry="2.900" transform="rotate(-22 4.800 11)"/><ellipse cx="9.200" cy="5.800" rx="2.300" ry="3"/><ellipse cx="14.800" cy="5.800" rx="2.300" ry="3"/><ellipse cx="19.200" cy="11" rx="2.200" ry="2.900" transform="rotate(22 19.200 11)"/>';

/** 발바닥 단독 SVG(캔버스 래스터화·스탬프용) */
export const pawSvg = (fill = PUPPY_ACCENT): string =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="48" height="48"><g fill="${fill}">${pawShapes}</g></svg>`;

/** 테니스공 14px: 액센트 본체 + 흰 솔기 */
export const BALL_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14" width="14" height="14" aria-hidden="true" focusable="false"><circle cx="7" cy="7" r="7" fill="#9a6b6b"/><path d="M2.200 2.800C5.200 5 5.200 9 2.200 11.200M11.800 2.800C8.800 5 8.800 9 11.800 11.200" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/></svg>';

/** 뼈다귀 도형(24x12 좌표계) */
export const BONE_SHAPES =
  '<rect x="5" y="4" width="14" height="4" rx="2"/><circle cx="4.500" cy="3.500" r="2.500"/><circle cx="4.500" cy="8.500" r="2.500"/><circle cx="19.500" cy="3.500" r="2.500"/><circle cx="19.500" cy="8.500" r="2.500"/>';
