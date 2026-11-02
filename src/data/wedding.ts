export const wedding = {
  groom: "고민혁",
  bride: "김은정",
  date: "2027-10-31",
  time: "10:30",
  timezone: "Asia/Seoul",
  durationMinutes: 120,
  venue: {
    name: "MJ컨벤션",
    hall: "", // 홀 이름 미정: 확정되면 입력
    address: "경기도 부천시 소사구 경인로 386",
    mapQuery: "MJ컨벤션 부천",
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
  // TODO: 계좌 정보가 확정되면 채우기. 비어 있으면 섹션이 렌더링되지 않는다.
  accounts: {
    groom: [] as Account[],
    bride: [] as Account[],
  },
  // 구글폼 URL. 비어 있으면 참석 여부 섹션이 숨겨진다.
  rsvpUrl: "",
  kakaoJsKey: "baa9a1762803ebc22b84409d4d68d7f1",
  share: {
    title: "고민혁 · 김은정 결혼합니다",
    description: "2027년 10월 31일 일요일 오전 10시 30분\nMJ컨벤션",
  },
  // public/audio/bgm.mp3 가 있을 때만 푸터에 표시
  musicCredit: "Music: generated with Suno",
};

export interface Account {
  label: string;
  bank: string;
  number: string;
  holder: string;
}
