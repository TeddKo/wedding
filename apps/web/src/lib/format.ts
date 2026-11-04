import { wedding } from "../data/wedding";

const dayNames = ["일", "월", "화", "수", "목", "금", "토"];
const [Y, M, D] = wedding.date.split("-").map(Number);
const [H, MIN] = wedding.time.split(":").map(Number);

const weekday = dayNames[new Date(Date.UTC(Y, M - 1, D)).getUTCDay()];

export const dateKo = `${Y}년 ${M}월 ${D}일 ${weekday}요일 ${H < 12 ? "오전" : "오후"} ${H % 12 || 12}시${MIN ? ` ${MIN}분` : ""}`;

export const venueLine = [wedding.venue.name, wedding.venue.hall].filter(Boolean).join(" ");
