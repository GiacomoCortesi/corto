export type AnalyticsEvent =
  | "app_open"
  | "onboarding_complete"
  | "open_github_profile"
  | "export_png"
  | "export_project"
  | "import_project"
  | "suggestions_request"
  | "suggestions_result"
  | "evolution_plan_request"
  | "evolution_plan_result"
  | "donation_open_support_page"
  | "donation_click"
  | "donation_thanks";

type Props = Record<string, string | number | boolean | null | undefined>;

export function track(event: AnalyticsEvent, props?: Props) {
  void event;
  void props;
  // Intentionally a no-op. (Analytics removed.)
}

