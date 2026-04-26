const COUNT_API_BASE = "https://api.countapi.xyz";

function key() {
  // Namespace + key. Keep stable across deploys.
  return { namespace: "corto.app", key: "supporters" };
}

export async function getSupportersCount(): Promise<number | null> {
  try {
    const { namespace, key: k } = key();
    const res = await fetch(`${COUNT_API_BASE}/get/${namespace}/${k}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { value?: unknown };
    return typeof data.value === "number" ? data.value : null;
  } catch {
    return null;
  }
}

export async function incrementSupportersCount(): Promise<number | null> {
  try {
    const { namespace, key: k } = key();
    const res = await fetch(`${COUNT_API_BASE}/hit/${namespace}/${k}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { value?: unknown };
    return typeof data.value === "number" ? data.value : null;
  } catch {
    return null;
  }
}

