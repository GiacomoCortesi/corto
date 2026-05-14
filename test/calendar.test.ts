import test from "node:test";
import assert from "node:assert/strict";

import { resolveSeasonYear } from "@/lib/calendar/resolve-year";
import { eventsForMonth } from "@/lib/calendar/events-by-day";
import { buildMonthGrid } from "@/lib/calendar/month-grid";
import { getMoonPhaseForDate } from "@/lib/lunar/phase";
import {
  addDaysIso,
  monthDayKeys,
  monthStartDate,
  monthEndDate,
} from "@/lib/weather/month-calendar";

test("resolveSeasonYear: rolls to next year for early months after late in year", () => {
  const dec = new Date(2026, 11, 15);
  assert.equal(resolveSeasonYear(1, dec), 2027);
  assert.equal(resolveSeasonYear(11, dec), 2026);
  assert.equal(resolveSeasonYear(12, dec), 2026);
});

test("resolveSeasonYear: keeps current year for upcoming months", () => {
  const may = new Date(2026, 4, 14);
  assert.equal(resolveSeasonYear(6, may), 2026);
  assert.equal(resolveSeasonYear(4, may), 2026);
  assert.equal(resolveSeasonYear(3, may), 2027);
});

test("eventsForMonth: filters and sorts by time", () => {
  const events = [
    { id: "a", at: Date.parse("2026-05-14T18:00:00"), kind: "watering" as const },
    { id: "b", at: Date.parse("2026-05-14T08:00:00"), kind: "sowing" as const },
    { id: "c", at: Date.parse("2026-06-01T08:00:00"), kind: "note" as const },
  ];
  const map = eventsForMonth(events, 2026, 5);
  assert.equal(map.size, 1);
  const day = map.get("2026-05-14");
  assert.ok(day);
  assert.equal(day!.length, 2);
  assert.equal(day![0].id, "b");
  assert.equal(day![1].id, "a");
});

test("buildMonthGrid: May 2026 starts on Friday (4 leading blanks)", () => {
  const cells = buildMonthGrid(2026, 5);
  const empties = cells.filter((c) => c.kind === "empty").length;
  const days = cells.filter((c) => c.kind === "day");
  assert.equal(empties, 4);
  assert.equal(days.length, 31);
  assert.equal(days[0].kind === "day" && days[0].day, 1);
});

test("monthDayKeys: returns all days for February 2024", () => {
  const keys = monthDayKeys(2024, 2);
  assert.equal(keys.length, 29);
  assert.equal(keys[0], "2024-02-01");
  assert.equal(keys[28], "2024-02-29");
});

test("monthStartDate and monthEndDate", () => {
  assert.equal(monthStartDate(2026, 5), "2026-05-01");
  assert.equal(monthEndDate(2026, 5), "2026-05-31");
});

test("addDaysIso: shifts calendar dates", () => {
  assert.equal(addDaysIso("2026-05-14", 16), "2026-05-30");
  assert.equal(addDaysIso("2026-05-14", -3), "2026-05-11");
});

test("getMoonPhaseForDate: known full moon near 2010-12-21", () => {
  const moon = getMoonPhaseForDate(2010, 12, 21);
  assert.equal(moon.phase, "full");
  assert.ok(moon.illumination > 0.9);
  assert.equal(moon.waxing, false);
});

test("getMoonPhaseForDate: illumination and waxing at cycle edges", () => {
  const newMoon = getMoonPhaseForDate(2026, 5, 17);
  assert.equal(newMoon.phase, "new");
  assert.ok(newMoon.illumination < 0.05);
  assert.ok(newMoon.angleRadians < 0.2 || newMoon.angleRadians > 2 * Math.PI - 0.2);
  assert.equal(newMoon.waxing, true);

  const firstQuarter = getMoonPhaseForDate(2026, 2, 24);
  assert.equal(firstQuarter.phase, "first_quarter");
  assert.ok(Math.abs(firstQuarter.illumination - 0.5) < 0.01);
  assert.ok(Math.abs(firstQuarter.angleRadians - Math.PI / 2) < 0.1);
  assert.equal(firstQuarter.waxing, true);

  const lastQuarter = getMoonPhaseForDate(2026, 9, 4);
  assert.equal(lastQuarter.phase, "last_quarter");
  assert.ok(Math.abs(lastQuarter.illumination - 0.5) < 0.01);
  assert.ok(Math.abs(lastQuarter.angleRadians - (3 * Math.PI) / 2) < 0.1);
  assert.equal(lastQuarter.waxing, false);
});

test("getMoonPhaseForDate: illumination matches cosine of angleRadians", () => {
  const moon = getMoonPhaseForDate(2026, 5, 20);
  const expected = (1 - Math.cos(moon.angleRadians)) / 2;
  assert.ok(Math.abs(moon.illumination - expected) < 1e-10);
});
