import type { ThemeName } from "../lib/themes";

export interface Parent {
  name: string;
  deceased: boolean;
}

export interface Person {
  name: string;
  /** 아들 / 장남 / 차남 / 딸 / 장녀 / 차녀 등 자유 문구 */
  relation: string;
  /** 두 글자 성 등 이름 분리가 안 맞을 때만 지정. 기본은 성(첫 글자)을 뺀 나머지 */
  givenName?: string;
  father: Parent;
  mother: Parent;
}

export type Side = "groom" | "bride";

export interface Account {
  role: Side | "father" | "mother";
  bank: string;
  number: string;
  /** 비면 해당 인물의 이름 */
  holder: string;
  /** 송금 앱 링크(토스/카카오페이 등). 있으면 "송금" 버튼 표시 */
  payLink?: string;
}

// TODO: 혼주 성함과 관계(장남/차녀 등)를 확정되면 입력. 부모 이름이 모두 비면 해당 쪽 혼주 줄은 숨겨진다.
const groom: Person = { name: "고민혁", relation: "아들", father: { name: "", deceased: false }, mother: { name: "", deceased: false } };
const bride: Person = { name: "김은정", relation: "딸", father: { name: "", deceased: false }, mother: { name: "", deceased: false } };
const empty = (role: Account["role"]): Account => ({ role, bank: "", number: "", holder: "" });

export const wedding = {
  groom,
  bride,
  /** 기본 테마. 방문자는 하단 버튼이나 `?theme=halloween|dev|puppy` 로 바꿀 수 있다 */
  theme: "halloween" as ThemeName,
  date: "2027-10-31",
  time: "10:30",
  timezone: "Asia/Seoul",
  venue: {
    name: "MJ컨벤션",
    hall: "", // 홀 이름 미정: 확정되면 입력
    address: "경기도 부천시 소사구 경인로 386",
    mapQuery: "MJ컨벤션 부천",
    lat: 37.48179793,
    lng: 126.79851199,
  },
  // TODO: 실제 인사말로 교체
  greeting: {
    title: "초대합니다",
    body: [
      "TODO 인사말 자리입니다.",
      "서로의 곁에서 가장 나다운 모습으로 웃을 수 있음을 알게 되어 평생을 함께하려 합니다.",
      "귀한 걸음으로 두 사람의 시작을 축복해 주시면 감사하겠습니다.",
    ],
  },
  // TODO: 은행/계좌번호를 채우기. 번호가 비면 "준비 중", 부모 이름과 번호가 모두 비면 그 행은 숨겨진다. 항목이 0개면 섹션이 숨겨진다.
  accounts: {
    groom: [empty("groom"), empty("father"), empty("mother")],
    bride: [empty("bride"), empty("father"), empty("mother")],
  } satisfies Record<Side, Account[]>,
  // 구글폼 URL. 비어 있으면 참석 여부 섹션이 숨겨진다.
  rsvpUrl: "",
  // 방명록 Worker URL. 비어 있으면 축하 글 섹션이 숨겨진다.
  guestbookApi: "https://wedding-guestbook.tddy-ko-83e.workers.dev",
  kakaoJsKey: "baa9a1762803ebc22b84409d4d68d7f1",
  share: {
    title: `${groom.name} · ${bride.name} 결혼합니다`,
    description: "2027년 10월 31일 일요일 오전 10시 30분\nMJ컨벤션",
  },
  // public/audio/bgm.mp3 가 있을 때만 푸터에 표시
  musicCredit: "Music: generated with Suno",
};
