export function getSiteUrl(): URL {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "http://localhost:3000";
  return new URL(raw);
}

export const SITE_NAME = "Corto";
export const SITE_TAGLINE = "Pianifica il tuo orto";

