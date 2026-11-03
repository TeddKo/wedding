/** 할로윈 금박 플레이크 5종(각 24x24). fall.ts 스프라이트용. 채움 단색 + 얇은 하이라이트로 박(箔) 질감. */
const f = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;

export const FLECKS: string[] = [
  f('<path d="M12 2l3.200 10L12 22 8.800 12Z" fill="#d6b374"/><path d="M12 2l3.200 10H12Z" fill="#efdca8" opacity=".7"/>'),
  f('<circle cx="12" cy="12" r="4.500" fill="#c8a56a"/><circle cx="10.500" cy="10.500" r="1.600" fill="#efdca8" opacity=".75"/>'),
  f('<path d="M4 15C7 6 15 4 20 9 17 16 9 18 4 15Z" fill="#cfab6c"/><path d="M6 14C9 9 14 8 17 9" fill="none" stroke="#efdca8" stroke-width="1" stroke-linecap="round" opacity=".7"/>'),
  f('<rect x="7" y="7" width="10" height="10" rx="1" transform="rotate(32 12 12)" fill="#dcc185"/><path d="M8 9l4-2" stroke="#fff6dc" stroke-width="1" stroke-linecap="round" opacity=".6"/>'),
  f('<path d="M12 3C12.800 9 15 11.200 21 12 15 12.800 12.800 15 12 21 11.200 15 9 12.800 3 12 9 11.200 11.200 9 12 3Z" fill="#e3c88e"/>'),
];
