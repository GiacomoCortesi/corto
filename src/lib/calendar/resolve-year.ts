/**
 * When the season slider only exposes month (1–12), pick the calendar year:
 * months earlier than the current month (with a small buffer) roll to next year.
 */
export function resolveSeasonYear(
  selectedMonth: number,
  now = new Date(),
): number {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  if (selectedMonth < currentMonth - 1) return currentYear + 1;
  return currentYear;
}
