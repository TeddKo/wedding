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

// TODO: 혼주 성함 "ㅇㅇㅇ" 은 템플릿 자리. 실제 성함으로 교체 필요. 부모 이름이 모두 비면 해당 쪽 혼주 줄 숨김.
const groom: Person = { name: "고민혁", relation: "장남", father: { name: "ㅇㅇㅇ", deceased: false }, mother: { name: "ㅇㅇㅇ", deceased: false } };
const bride: Person = { name: "김은정", relation: "장녀", father: { name: "ㅇㅇㅇ", deceased: false }, mother: { name: "ㅇㅇㅇ", deceased: false } };
/** 빌드 시 주입 필수 공개 설정값, 누락 시 빌드 실패 */
const env = (name: "PUBLIC_API_URL" | "PUBLIC_KAKAO_JS_KEY"): string => {
  const v = import.meta.env[name];
  if (!v) throw new Error(`${name} 미설정 — apps/web/.env 또는 GitHub Actions Variables 확인`);
  return v;
};
const empty = (role: Account["role"]): Account => ({ role, bank: "", number: "", holder: "" });

export interface Transit {
  subway?: string[];
  bus?: string[];
  car?: string;
  parking?: string;
}

// TODO: 교통/주차 안내는 확인된 내용만 입력. 비어 있으면 렌더 생략.
const transit: Transit = { subway: [], bus: [], car: "", parking: "" };

const venue = {
  name: "MJ컨벤션",
  hall: "3층 다이너스티홀",
  address: "경기도 부천시 소사구 경인로 386",
  mapQuery: "MJ컨벤션 부천",
  lat: 37.48179793,
  lng: 126.79851199,
  transit,
};

export const wedding = {
  groom,
  bride,
  /** 기본 테마. 방문자는 하단 버튼이나 `?theme=halloween|dev|puppy` 로 변경 가능 */
  theme: "halloween" as ThemeName,
  /** 커버 사진 초점(object-position). 얼굴이 잘리면 값 조정 */
  cover: { focus: "50% 35%" },
  date: "2027-10-31",
  time: "10:30",
  timezone: "Asia/Seoul",
  venue,
  // TODO: 실제 인사말로 교체
  greeting: {
    title: "초대합니다",
    body: [
      "TODO 인사말 자리입니다.",
      "서로의 곁에서 가장 나다운 모습으로 웃을 수 있음을 알게 되어 평생을 함께하려 합니다.",
      "귀한 걸음으로 두 사람의 시작을 축복해 주시면 감사하겠습니다.",
    ],
  },
  // TODO: 은행/계좌번호 채우기. 번호가 비면 "준비 중", 부모 이름과 번호가 모두 비면 그 행 숨김. 항목이 0개면 섹션 숨김.
  accounts: {
    groom: [empty("groom"), empty("father"), empty("mother")],
    bride: [empty("bride"), empty("father"), empty("mother")],
  } satisfies Record<Side, Account[]>,
  // 구글폼 URL. 비어 있으면 참석 여부 섹션 숨김.
  rsvpUrl: "",
  // 방명록 Worker URL. 비어 있으면 축하 글 섹션 숨김.
  guestbookApi: env("PUBLIC_API_URL"),
  // 하객 스냅샷 업로드 Worker URL(방명록과 같은 Worker). 비어 있으면 스냅샷 섹션 숨김.
  snapshotsApi: env("PUBLIC_API_URL"),
  // 스냅샷 이미지 R2 공개 주소(끝 슬래시 없이). 미설정 시 Worker 의 /p/:uuid/:kind 사용.
  snapshotsCdn: import.meta.env.PUBLIC_SNAPSHOTS_CDN ?? "",
  // 하객 투표(방명록과 같은 Worker 사용). question 이 비면 섹션 숨김. 항목은 하객이 직접 추가.
  poll: { question: "하객 중 코스튬을 가장 잘한 사람은?" },
  kakaoJsKey: env("PUBLIC_KAKAO_JS_KEY"),
  share: {
    title: `${groom.name} & ${bride.name} 결혼합니다`,
    description: `2027년 10월 31일 일요일 오전 10시 30분\n${venue.name} ${venue.hall}`,
    /** "링크 복사" 버튼이 복사하는 주소(단축 URL). 비우면 페이지 주소 */
    copyUrl: "https://url.kr/1hud9d",
  },
  // public/audio/bgm.mp3 가 있을 때만 푸터에 표시
  musicCredit: "Music: generated with Suno",
};
