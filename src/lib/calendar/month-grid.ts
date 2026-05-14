import { dayKeyFromParts } from "@/lib/calendar/day-key";

export type MonthGridCell =
  | { kind: "empty"; key: string }
  | { kind: "day"; key: string; day: number };

const WEEKDAY_HEADERS = ["L", "M", "M", "G", "V", "S", "D"] as const;

/** Monday-first weekday index: 0 = Monday … 6 = Sunday */
function mondayFirstWeekday(year: number, month: number): number {
  const js = new Date(year, month - 1, 1).getDay();
  return js === 0 ? 6 : js - 1;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function buildMonthGrid(year: number, month: number): MonthGridCell[] {
  const leading = mondayFirstWeekday(year, month);
  const total = daysInMonth(year, month);
  const cells: MonthGridCell[] = [];

  for (let i = 0; i < leading; i++) {
    cells.push({ kind: "empty", key: `empty-${i}` });
  }
  for (let day = 1; day <= total; day++) {
    cells.push({
      kind: "day",
      key: dayKeyFromParts(year, month, day),
      day,
    });
  }
  return cells;
}

export { WEEKDAY_HEADERS };
