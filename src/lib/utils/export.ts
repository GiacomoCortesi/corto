import { toPng } from "html-to-image";

export async function exportElementToPng(
  element: HTMLElement,
  filename: string
): Promise<void> {
  const dataUrl = await toPng(element, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: getComputedStyle(document.documentElement)
      .getPropertyValue("--background")
      .trim() || "#f0e4e9",
    filter: (node) => {
      // Esclude i controlli interattivi di React Flow dall'export
      if (!(node instanceof HTMLElement)) return true;
      if (node.classList.contains("react-flow__panel")) return false;
      if (node.classList.contains("react-flow__minimap")) return false;
      if (node.classList.contains("react-flow__controls")) return false;
      return true;
    },
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export function safeFilename(name: string) {
  return (
    name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "orto"
  );
}
