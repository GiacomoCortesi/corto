import type { GardenActivity } from "@/lib/types";
import { localDayKey } from "@/lib/calendar/day-key";

export function groupEventsByDay(
  events: GardenActivity[],
): Map<string, GardenActivity[]> {
  const map = new Map<string, GardenActivity[]>();
  for (const e of events) {
    const k = localDayKey(e.at);
    const list = map.get(k);
    if (list) list.push(e);
    else map.set(k, [e]);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.at - b.at);
  }
  return map;
}

export function eventsForMonth(
  events: GardenActivity[],
  year: number,
  month: number,
): Map<string, GardenActivity[]> {
  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  const all = groupEventsByDay(events);
  const out = new Map<string, GardenActivity[]>();
  for (const [key, list] of all) {
    if (key.startsWith(prefix)) out.set(key, list);
  }
  return out;
}
