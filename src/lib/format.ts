import { wedding } from "../data/wedding";

export const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
const [Y, M, D] = wedding.date.split("-").map(Number);
const [H, MIN] = wedding.time.split(":").map(Number);

export const year = Y;
export const month = M;
export const day = D;
export const weekday = dayNames[new Date(Date.UTC(Y, M - 1, D)).getUTCDay()];

export const dateKo = `${Y}년 ${M}월 ${D}일 ${weekday}요일 ${H < 12 ? "오전" : "오후"} ${H % 12 || 12}시${MIN ? ` ${MIN}분` : ""}`;

export const venueLine = [wedding.venue.name, wedding.venue.hall].filter(Boolean).join(" ");

/** 달력 그리드: 앞쪽 빈칸(null) + 1..말일 */
export function monthGrid() {
  const lead = new Date(Date.UTC(Y, M - 1, 1)).getUTCDay();
  const last = new Date(Date.UTC(Y, M, 0)).getUTCDate();
  return [...Array<null>(lead).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)];
}

/** Asia/Seoul(UTC+9, DST 없음) 시각을 UTC ICS 형식으로 환산 */
export function icsUtc(minutesAfterStart = 0) {
  const t = new Date(Date.UTC(Y, M - 1, D, H, MIN) - 9 * 3600e3 + minutesAfterStart * 60e3);
  return t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
