/** 할로윈 사탕 5종 손 SVG(각 24x24). fall.ts 스프라이트 및 정적 착지 사탕 공용. */
const S = 'stroke="#2b2420" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"';

const wrap = (c: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><g ${S} fill="${c}"><path d="M7 12 2 8v8ZM17 12l5-4v8Z"/><ellipse cx="12" cy="12" rx="5.500" ry="4.500"/></g><path d="M9 10.500q3-1.500 6 0" fill="none" stroke="#fbf8f3" stroke-width="1" stroke-linecap="round" opacity=".7"/></svg>`;

const corn = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3l2.300 6H9.700Z" fill="#fbf8f3"/><path d="M9.700 9h4.600l2.400 6H7.300Z" fill="#d8a23a"/><path d="M7.300 15h9.400l2.300 6H5Z" fill="#a0522d"/><path d="M12 3 19 21H5Z" fill="none" ${S}/></svg>`;

const lolly = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 15v8" fill="none" ${S}/><circle cx="12" cy="10" r="7" fill="#c76a6a" ${S}/><path d="M12 10a1.500 1.500 0 1 1 1.500 1.500A3 3 0 1 1 10.500 8.500a4.500 4.500 0 1 1 4.500 4.500" fill="none" stroke="#fbf8f3" stroke-width="1.300" stroke-linecap="round"/></svg>`;

export const CANDY: string[] = [wrap("#7a3b5c"), wrap("#8a9a6b"), wrap("#d8a23a"), corn, lolly];
