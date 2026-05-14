export type MoonPhaseKind =
  | "new"
  | "waxing_crescent"
  | "first_quarter"
  | "waxing_gibbous"
  | "full"
  | "waning_gibbous"
  | "last_quarter"
  | "waning_crescent";

export type MoonPhaseInfo = {
  phase: MoonPhaseKind;
  illumination: number;
  ageDays: number;
  /** Sun–moon angle in radians (0 = new, π = full, 2π = new). */
  angleRadians: number;
  waxing: boolean;
  labelIt: string;
  emoji: string;
};

export const MOON_SYNODIC_DAYS = 29.530588853;

const SYNODIC = MOON_SYNODIC_DAYS;

/** Approximate moon age in days for a UTC calendar date (noon UTC). */
function moonAgeDaysUTC(year: number, month: number, day: number): number {
  const knownNewMoon = Date.UTC(2000, 0, 6, 18, 14, 0);
  const t = Date.UTC(year, month - 1, day, 12, 0, 0);
  const days = (t - knownNewMoon) / 86_400_000;
  const age = days % SYNODIC;
  return age < 0 ? age + SYNODIC : age;
}

function phaseFromAge(age: number): MoonPhaseKind {
  const p = age / SYNODIC;
  if (p < 0.0625 || p >= 0.9375) return "new";
  if (p < 0.1875) return "waxing_crescent";
  if (p < 0.3125) return "first_quarter";
  if (p < 0.4375) return "waxing_gibbous";
  if (p < 0.5625) return "full";
  if (p < 0.6875) return "waning_gibbous";
  if (p < 0.8125) return "last_quarter";
  return "waning_crescent";
}

const LABELS: Record<MoonPhaseKind, { labelIt: string; emoji: string }> = {
  new: { labelIt: "Luna nuova", emoji: "🌑" },
  waxing_crescent: { labelIt: "Luna crescente", emoji: "🌒" },
  first_quarter: { labelIt: "Primo quarto", emoji: "🌓" },
  waxing_gibbous: { labelIt: "Gibbosa crescente", emoji: "🌔" },
  full: { labelIt: "Luna piena", emoji: "🌕" },
  waning_gibbous: { labelIt: "Gibbosa calante", emoji: "🌖" },
  last_quarter: { labelIt: "Ultimo quarto", emoji: "🌗" },
  waning_crescent: { labelIt: "Luna calante", emoji: "🌘" },
};

export function getMoonPhaseForDate(
  year: number,
  month: number,
  day: number,
): MoonPhaseInfo {
  const age = moonAgeDaysUTC(year, month, day);
  const phase = phaseFromAge(age);
  const angleRadians = (age / SYNODIC) * 2 * Math.PI;
  const illumination = (1 - Math.cos(angleRadians)) / 2;
  const meta = LABELS[phase];
  return {
    phase,
    illumination,
    ageDays: age,
    angleRadians,
    waxing: angleRadians <= Math.PI,
    labelIt: meta.labelIt,
    emoji: meta.emoji,
  };
}

export function getMoonPhaseFromDayKey(dayKey: string): MoonPhaseInfo {
  const [y, m, d] = dayKey.split("-").map(Number);
  return getMoonPhaseForDate(y, m, d);
}
