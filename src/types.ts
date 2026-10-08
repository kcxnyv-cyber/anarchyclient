export type Status = "ok" | "bad";
export type Category = "Combat" | "Movement" | "Render" | "World" | "Misc";
export type View = "home" | "modules" | "dashboard";

export interface Mod {
  name: string;
  cat: Category;
  desc: string;
  status: Status;
  /** Timestamp (ms) de la dernière vérification. */
  checkedAt: number;
}

export interface License {
  key: string;
  planLabel: string;
  totalDays: number;
  leftDays: number;
  lifetime: boolean;
  boughtAt: number;
}
