export const PLANT_CATEGORIES = [
  { id: "all", label: "Tutte" },
  { id: "ortaggio", label: "Ortaggi" },
  { id: "frutto", label: "Frutti" },
  { id: "frutti-di-bosco", label: "Bosco" },
  { id: "foglia", label: "Foglia" },
  { id: "radice", label: "Radici" },
  { id: "leguminosa", label: "Legumi" },
  { id: "aromatica", label: "Aromat." },
  { id: "fiore-edule", label: "Fiori" },
] as const;

export type PlantCategoryFilter = (typeof PLANT_CATEGORIES)[number]["id"];
