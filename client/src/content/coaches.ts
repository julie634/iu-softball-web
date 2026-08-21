/**
 * Coaching + support staff sourced from IU Athletics.
 * Source: https://iuhoosiers.com/sports/softball/coaches (2027 staff page)
 * Retrieved 2026-08-21. Only fields published in that table are stored.
 * No bios or headshots — those were not in the fetched table.
 */
export const COACHES_SOURCE_URL = "https://iuhoosiers.com/sports/softball/coaches";
export const COACHES_SOURCED_AT = "2026-08-21";

export type CoachGroup = "coaching" | "support";

export interface CoachRecord {
  id: string;
  name: string;
  title: string;
  email: string | null;
  phone: string | null;
  group_name: CoachGroup;
  sort_order: number;
  source_url: string;
  sourced_at: string;
}

export const SOURCED_COACHES: CoachRecord[] = [
  {
    id: "shonda-stanton",
    name: "Shonda Stanton",
    title: "Head Coach",
    email: "softball@iu.edu",
    phone: "(812) 855-9518",
    group_name: "coaching",
    sort_order: 1,
    source_url: COACHES_SOURCE_URL,
    sourced_at: COACHES_SOURCED_AT,
  },
  {
    id: "chanda-bell",
    name: "Chanda Bell",
    title: "Associate Head Coach",
    email: "bell1@iu.edu",
    phone: "(812) 855-9738",
    group_name: "coaching",
    sort_order: 2,
    source_url: COACHES_SOURCE_URL,
    sourced_at: COACHES_SOURCED_AT,
  },
  {
    id: "kendra-kirkhoff",
    name: "Kendra Kirkhoff",
    title: "Assistant Coach",
    email: "kennkirk@iu.edu",
    phone: null,
    group_name: "coaching",
    sort_order: 3,
    source_url: COACHES_SOURCE_URL,
    sourced_at: COACHES_SOURCED_AT,
  },
  {
    id: "cassie-hendrix",
    name: "Cassie Hendrix",
    title: "Assistant Coach/Director of Operations",
    email: "hendrix@iu.edu",
    phone: "(812) 855-5462",
    group_name: "coaching",
    sort_order: 4,
    source_url: COACHES_SOURCE_URL,
    sourced_at: COACHES_SOURCED_AT,
  },
  {
    id: "morgan-deplanty",
    name: "Morgan DePlanty, MS, LAT, ATC",
    title: "Athletic Trainer (Softball, Men's Tennis)",
    email: "mdeplant@iu.edu",
    phone: "(812) 855-1326",
    group_name: "support",
    sort_order: 10,
    source_url: COACHES_SOURCE_URL,
    sourced_at: COACHES_SOURCED_AT,
  },
  {
    id: "ben-smith",
    name: "Ben Smith",
    title: "Assistant Director of Academic Services and Certification",
    email: "bds10@iu.edu",
    phone: "(812) 855-2861",
    group_name: "support",
    sort_order: 11,
    source_url: COACHES_SOURCE_URL,
    sourced_at: COACHES_SOURCED_AT,
  },
  {
    id: "jackson-yeary",
    name: "Jackson Yeary",
    title:
      "Assistant Director for Strategic Communications (Field Hockey, Wrestling, Softball, Men's Tennis)",
    email: "jbyeary@iu.edu",
    phone: null,
    group_name: "support",
    sort_order: 12,
    source_url: COACHES_SOURCE_URL,
    sourced_at: COACHES_SOURCED_AT,
  },
  {
    id: "aidan-mattox",
    name: "Aidan Mattox",
    title: "Student Manager",
    email: null,
    phone: null,
    group_name: "support",
    sort_order: 13,
    source_url: COACHES_SOURCE_URL,
    sourced_at: COACHES_SOURCED_AT,
  },
];

export function coachingStaff(coaches: readonly CoachRecord[]): CoachRecord[] {
  return coaches.filter((c) => c.group_name === "coaching");
}

export function supportStaff(coaches: readonly CoachRecord[]): CoachRecord[] {
  return coaches.filter((c) => c.group_name === "support");
}
