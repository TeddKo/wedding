import type { Account, Person, Side } from "../data/wedding";

export const givenName = (p: Person) => p.givenName ?? p.name.slice(1);

export const hasParents = (p: Person) => !!(p.father.name || p.mother.name);

const ROLE = { groom: "신랑", bride: "신부" } as const;
const SUFFIX = { groom: "", bride: "", father: " 아버지", mother: " 어머니" } as const;

export interface AccountRow {
  label: string;
  bank: string;
  number: string;
  holder: string;
  payLink?: string;
}

/** 이름이 비고 번호도 비면 부모 행 숨김. 예금주는 비면 해당 인물 이름. */
export function accountRows(side: Side, person: Person, list: Account[]): AccountRow[] {
  return list.flatMap((a) => {
    const who = a.role === "father" ? person.father.name : a.role === "mother" ? person.mother.name : person.name;
    if ((a.role === "father" || a.role === "mother") && !who && !a.number) return [];
    const { payLink } = a;
    return [{ label: ROLE[side] + SUFFIX[a.role], bank: a.bank, number: a.number, holder: a.holder || who, payLink }];
  });
}
