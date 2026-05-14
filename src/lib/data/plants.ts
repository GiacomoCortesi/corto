import type { CropFamily, Plant, PlantFertilizer, PlantTreatment, RotationGroup } from "@/lib/types";
import { tagAnti, tagComp } from "@/lib/data/neighbor-reasons";

/**
 * Prototype dataset of common vegetables/herbs with companion-planting
 * relationships based on European gardening tradition.
 * `sowing` and `harvest` values are indicative for a temperate climate.
 */

/**
 * Shared fertilization/treatments for all tomato varieties
 * (keeps consistency with the base "tomato" entry).
 */
const TOMATO_FERTILIZER: PlantFertilizer = {
  demand: "high",
  type: [
    "letame maturo o compost in pre-trapianto (3-4 kg/m²)",
    "macerato di ortica in copertura",
    "concime ricco di potassio (cenere di legna) in fruttificazione",
  ],
  schedule:
    "fondo + copertura ogni 15 giorni dopo allegagione, alto K dai primi frutti",
  notes:
    "evitare eccessi di azoto (riducono allegagione); apporto di calcio per prevenire marciume apicale",
};

const TOMATO_TREATMENTS: PlantTreatment = {
  pests: [
    "peronospora (Phytophthora infestans)",
    "oidio (mal bianco)",
    "Tuta absoluta (tignola)",
    "afidi",
    "marciume apicale (carenza di calcio)",
  ],
  remedies: [
    "poltiglia bordolese / rame in prevenzione",
    "zolfo o bicarbonato di sodio contro oidio",
    "Bacillus thuringiensis aizawai contro Tuta",
    "olio di neem / sapone molle contro afidi",
    "pacciamatura e irrigazione regolare alla base",
  ],
};

/**
 * Shared fertilization/treatments for all zucchini varieties.
 */
const ZUCCHINI_FERTILIZER: PlantFertilizer = {
  demand: "high",
  type: [
    "letame maturo (1-2 kg/m²) o compost in pre-impianto",
    "macerato di ortica in copertura",
    "concime potassico in fruttificazione",
  ],
  schedule: "fondo + copertura ogni 20 giorni durante la produzione",
  notes: "ortaggio ingordo: terreno ricco di sostanza organica",
};

const ZUCCHINI_TREATMENTS: PlantTreatment = {
  pests: [
    "oidio (mal bianco)",
    "peronospora",
    "afidi",
    "tripidi",
    "marciume del frutto",
  ],
  remedies: [
    "zolfo o bicarbonato di sodio contro oidio",
    "poltiglia bordolese in prevenzione (max 6 kg rame/ha/anno)",
    "Ampelomyces quisqualis (fungo antagonista) contro oidio",
    "olio di neem / sapone di Marsiglia per afidi",
    "zeolite micronizzata come barriera",
  ],
};

/**
 * Shared fertilization/treatments for cabbage varieties (Brassica oleracea).
 */
const CABBAGE_FERTILIZER: PlantFertilizer = {
  demand: "high",
  type: [
    "letame maturo o compost abbondante (3-4 kg/m²) in pre-trapianto",
    "macerato di ortica in copertura",
    "boro (carenze frequenti nelle brassicacee)",
  ],
  schedule:
    "fondo abbondante + copertura azotata ogni 20 giorni durante la formazione del cespo",
  notes: "ortaggio molto esigente; pH 6,5-7,5 per prevenire ernia del cavolo",
};

const CABBAGE_TREATMENTS: PlantTreatment = {
  pests: [
    "cavolaia (Pieris brassicae)",
    "altica",
    "afidi (Brevicoryne brassicae)",
    "tignola del cavolo (Plutella xylostella)",
    "mosca del cavolo (Delia radicum)",
    "ernia del cavolo (Plasmodiophora)",
  ],
  remedies: [
    "Bacillus thuringiensis kurstaki contro larve di lepidotteri",
    "rete antinsetto in piena pressione",
    "zeolite cubana o caolino come barriera",
    "consociazione con pomodoro/sedano",
    "macerato di pomodoro o assenzio",
    "rotazione di almeno 4 anni",
  ],
};

/**
 * Mese 1-12 in cui la pianta e' "pertinente" in orto: semina o raccolta.
 * Usato dal filtro stagione sul canvas (opacita') cosi' ad es. aprile
 * conta per il pomodoro (sembra mar-mag) e non solo per il raccolto.
 */
export function plantActiveInMonth(plant: Plant, month: number): boolean {
  return (
    plant.sowing.includes(month) ||
    (plant.transplanting ?? []).includes(month) ||
    plant.harvest.includes(month)
  );
}

/** Tipo di attività nel mese per bordo/legenda sull'aiuola. */
export type PlantSeasonMode =
  | "none"
  | "sowing"
  | "transplanting"
  | "harvest"
  | "sowing+transplanting"
  | "sowing+harvest"
  | "transplanting+harvest"
  | "all";

/**
 * Categorizza il mese rispetto a semina e raccolta (per bordo colorato).
 */
export function plantSeasonModeForMonth(
  plant: Plant,
  month: number,
): PlantSeasonMode {
  const s = plant.sowing.includes(month);
  const t = (plant.transplanting ?? []).includes(month);
  const h = plant.harvest.includes(month);
  if (s && t && h) return "all";
  if (s && t) return "sowing+transplanting";
  if (s && h) return "sowing+harvest";
  if (t && h) return "transplanting+harvest";
  if (s) return "sowing";
  if (t) return "transplanting";
  if (h) return "harvest";
  return "none";
}

export const PLANTS: Plant[] = [
  {
    id: "pomodoro",
    name: "Pomodoro",
    scientific: "Solanum lycopersicum",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 60,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5],
    transplanting: [4, 5, 6],
    harvest: [7, 8, 9, 10],
    companions: tagComp("pomodoro", ["basilico", "carota", "prezzemolo", "cipolla", "aglio", "origano", "timo"]),
    antagonists: tagAnti("pomodoro", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "basilico",
    name: "Basilico",
    scientific: "Ocimum basilicum",
    emoji: "🌿",
    category: "aromatica",
    perCell: 4,
    defaultSpacingCm: 25,
    sun: "full",
    water: "medium",
    sowing: [4, 5, 6],
    harvest: [6, 7, 8, 9],
    companions: tagComp("basilico", ["pomodoro", "peperone", "melanzana"]),
    antagonists: tagAnti("basilico", ["ruta"]),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo in pre-semina",
        "macerato di ortica diluito occasionale",
      ],
      schedule: "leggera concimazione di fondo; cimature periodiche",
      notes:
        "evitare eccessi di azoto: riducono l'aroma e favoriscono la peronospora",
    },
    treatments: {
      pests: [
        "peronospora del basilico (Peronospora belbahrii)",
        "afidi",
        "lumache",
        "Botrytis (in semenzaio)",
      ],
      remedies: [
        "buona aerazione e niente bagnatura fogliare",
        "varietà resistenti alla peronospora",
        "sapone di Marsiglia per afidi",
        "fosfato ferrico contro lumache",
      ],
    },
  },
  {
    id: "carota",
    name: "Carota",
    scientific: "Daucus carota",
    emoji: "🥕",
    category: "radice",
    perCell: 16,
    defaultSpacingCm: 8,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 5, 6, 7],
    harvest: [6, 7, 8, 9, 10],
    companions: tagComp("carota", ["pomodoro", "cipolla", "aglio", "porro", "rosmarino"]),
    antagonists: tagAnti("carota", ["aneto"]),
    fertilizer: {
      demand: "medium",
      type: [
        "compost ben maturo in pre-semina",
        "cenere di legna (potassio) leggera",
      ],
      schedule:
        "concimazione di fondo alla coltura precedente; no copertura azotata",
      notes:
        "evitare letame fresco: causa biforcazione e marciumi delle radici",
    },
    treatments: {
      pests: [
        "mosca della carota (Psila rosae)",
        "afidi",
        "elateridi (vermi fil di ferro)",
      ],
      remedies: [
        "rete antinsetto a maglia fine",
        "consociazione con porro/cipolla/aglio",
        "irrigazione con macerato d'aglio",
        "polvere di roccia (zeolite, tanaceto)",
        "Beauveria bassiana per elateridi",
      ],
    },
  },
  {
    id: "lattuga",
    name: "Lattuga",
    scientific: "Lactuca sativa",
    emoji: "🥬",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 25,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5, 8, 9],
    transplanting: [3, 4, 5, 9, 10],
    harvest: [5, 6, 7, 10, 11],
    companions: tagComp("lattuga", ["carota", "ravanello", "cetriolo", "fragola"]),
    antagonists: tagAnti("lattuga", ["prezzemolo"]),
    fertilizer: {
      demand: "medium",
      type: [
        "compost maturo in pre-trapianto",
        "macerato di ortica in copertura",
      ],
      schedule: "fondo + 1 leggera copertura azotata in crescita",
      notes: "irrigazione regolare; stress idrico provoca prefioritura",
    },
    treatments: {
      pests: [
        "lumache e limacce",
        "afidi",
        "mosca minatrice",
        "nottua gialla",
        "marciume del colletto",
      ],
      remedies: [
        "fosfato ferrico (lumachicida bio)",
        "sapone di Marsiglia / olio di neem",
        "Spinosad contro mosca minatrice",
        "Bacillus thuringiensis kurstaki contro nottua",
        "Beauveria bassiana per elateridi",
      ],
    },
  },
  {
    id: "lattuga-romana",
    name: "Lattuga romana",
    scientific: "Lactuca sativa var. longifolia",
    emoji: "🥬",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 30,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5, 8, 9],
    harvest: [5, 6, 7, 10, 11],
    companions: tagComp("lattuga-romana", ["carota", "ravanello", "cetriolo", "fragola"]),
    antagonists: tagAnti("lattuga-romana", ["prezzemolo"]),
    fertilizer: {
      demand: "medium",
      type: ["compost maturo in pre-trapianto", "macerato di ortica leggero"],
      schedule: "fondo + 1 leggera copertura azotata in crescita",
      notes: "più tollerante al caldo di altre lattughe, ma teme stress idrico",
    },
    treatments: {
      pests: ["lumache e limacce", "afidi", "mosca minatrice", "marciumi"],
      remedies: [
        "fosfato ferrico (lumachicida bio)",
        "sapone di Marsiglia / olio di neem",
        "Spinosad contro mosca minatrice",
        "irrigazione al mattino e buon drenaggio",
      ],
    },
  },
  {
    id: "lattuga-iceberg",
    name: "Lattuga iceberg",
    scientific: "Lactuca sativa var. capitata",
    emoji: "🥬",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 30,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5, 8, 9],
    harvest: [5, 6, 7, 10, 11],
    companions: tagComp("lattuga-iceberg", ["carota", "ravanello", "cetriolo", "fragola"]),
    antagonists: tagAnti("lattuga-iceberg", ["prezzemolo"]),
    fertilizer: {
      demand: "medium",
      type: ["compost maturo in pre-trapianto", "macerato di ortica leggero"],
      schedule: "fondo + 1 leggera copertura azotata in crescita",
      notes:
        "per un cespo compatto serve crescita regolare: evitare sbalzi idrici",
    },
    treatments: {
      pests: ["lumache e limacce", "afidi", "mosca minatrice", "marciumi del cuore"],
      remedies: [
        "fosfato ferrico (lumachicida bio)",
        "sapone di Marsiglia / olio di neem",
        "Spinosad contro mosca minatrice",
        "evitare ristagni e bagnature serali",
      ],
    },
  },
  {
    id: "lattuga-lollo",
    name: "Lattuga lollo (verde/rossa)",
    scientific: "Lactuca sativa var. crispa",
    emoji: "🥬",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 25,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5, 8, 9],
    harvest: [5, 6, 7, 10, 11],
    companions: tagComp("lattuga-lollo", ["carota", "ravanello", "cetriolo", "fragola"]),
    antagonists: tagAnti("lattuga-lollo", ["prezzemolo"]),
    fertilizer: {
      demand: "medium",
      type: ["compost maturo in pre-trapianto"],
      schedule: "fondo + eventuale copertura leggera se crescita lenta",
      notes:
        "adatta anche a raccolta ‘a taglio’ con più passaggi (foglie esterne)",
    },
    treatments: {
      pests: ["lumache e limacce", "afidi", "mosca minatrice"],
      remedies: [
        "fosfato ferrico (lumachicida bio)",
        "sapone di Marsiglia / olio di neem",
        "rete antinsetto e buona aerazione",
      ],
    },
  },
  {
    id: "lattuga-canasta",
    name: "Lattuga canasta",
    scientific: "Lactuca sativa (tipo Batavia)",
    emoji: "🥬",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 30,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5, 8, 9],
    harvest: [5, 6, 7, 10, 11],
    companions: tagComp("lattuga-canasta", ["carota", "ravanello", "cetriolo", "fragola"]),
    antagonists: tagAnti("lattuga-canasta", ["prezzemolo"]),
    fertilizer: {
      demand: "medium",
      type: ["compost maturo in pre-trapianto", "macerato di ortica leggero"],
      schedule: "fondo + 1 leggera copertura in crescita (se necessario)",
      notes: "rustica e croccante; attenzione a caldo e stress idrico",
    },
    treatments: {
      pests: ["lumache e limacce", "afidi", "mosca minatrice", "marciumi"],
      remedies: [
        "fosfato ferrico (lumachicida bio)",
        "sapone di Marsiglia / olio di neem",
        "Spinosad contro mosca minatrice",
        "pacciamatura per mantenere umidità costante",
      ],
    },
  },
  {
    id: "zucchina",
    name: "Zucchina",
    scientific: "Cucurbita pepo",
    emoji: "🥒",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 90,
    sun: "full",
    water: "high",
    sowing: [4, 5, 6],
    harvest: [6, 7, 8, 9],
    companions: tagComp("zucchina", ["fagiolo", "rucola", "mais"]),
    antagonists: tagAnti("zucchina", ["patata", "cetriolo"]),
    fertilizer: ZUCCHINI_FERTILIZER,
    treatments: ZUCCHINI_TREATMENTS,
  },
  {
    id: "peperone",
    name: "Peperone",
    scientific: "Capsicum annuum",
    emoji: "🫑",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 5],
    transplanting: [5, 6],
    harvest: [7, 8, 9, 10],
    companions: tagComp("peperone", ["basilico", "carota", "cipolla"]),
    antagonists: tagAnti("peperone", ["fagiolo"]),
    fertilizer: {
      demand: "high",
      type: [
        "letame maturo o compost in pre-trapianto",
        "macerato di consolida o ortica in copertura",
        "concime potassico in fruttificazione",
      ],
      schedule:
        "fondo + copertura ogni 15-20 giorni; alto K dai primi frutti",
      notes:
        "irrigazione costante e regolare; evitare squilibri idrici (cracking dei frutti)",
    },
    treatments: {
      pests: [
        "afidi",
        "tripidi",
        "oidio",
        "marciume apicale",
        "cimice asiatica",
      ],
      remedies: [
        "olio di neem (azadiractina)",
        "sapone di Marsiglia per afidi",
        "zolfo o bicarbonato di potassio contro oidio",
        "Amblyseius cucumeris (acaro predatore) contro tripidi",
        "calcio in fruttificazione",
      ],
    },
  },
  {
    id: "peperone-friggitelli",
    name: "Peperoni friggitelli",
    scientific: "Capsicum annuum (friggitello)",
    emoji: "🌶️",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 45,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 5],
    transplanting: [5, 6],
    harvest: [7, 8, 9, 10],
    companions: tagComp("peperone-friggitelli", ["basilico", "carota", "cipolla"]),
    antagonists: tagAnti("peperone-friggitelli", ["fagiolo"]),
    fertilizer: {
      demand: "high",
      type: [
        "letame maturo o compost in pre-trapianto",
        "macerato di consolida o ortica in copertura",
        "concime potassico in fruttificazione",
      ],
      schedule: "fondo + copertura ogni 15-20 giorni; alto K dai primi frutti",
      notes:
        "raccolta frequente dei frutti immaturi stimola nuova produzione",
    },
    treatments: {
      pests: ["afidi", "tripidi", "oidio", "marciume apicale", "cimice asiatica"],
      remedies: [
        "olio di neem (azadiractina)",
        "sapone di Marsiglia per afidi",
        "zolfo o bicarbonato di potassio contro oidio",
        "Amblyseius cucumeris (acaro predatore) contro tripidi",
        "calcio in fruttificazione",
      ],
    },
  },
  {
    id: "peperoncino-corno-rosso",
    name: "Peperoncino corno rosso",
    scientific: "Capsicum annuum (corno rosso piccante)",
    emoji: "🌶️",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 45,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 5],
    transplanting: [5, 6],
    harvest: [7, 8, 9, 10],
    companions: tagComp("peperoncino-corno-rosso", ["basilico", "carota", "cipolla"]),
    antagonists: tagAnti("peperoncino-corno-rosso", ["fagiolo"]),
    fertilizer: {
      demand: "high",
      type: [
        "letame maturo o compost in pre-trapianto",
        "macerato di consolida o ortica in copertura",
        "concime potassico in fruttificazione",
      ],
      schedule: "fondo + copertura ogni 15-20 giorni; alto K dai primi frutti",
      notes: "teme ristagni idrici; pacciamatura utile per regolarità",
    },
    treatments: {
      pests: ["afidi", "tripidi", "oidio", "marciume apicale", "cimice asiatica"],
      remedies: [
        "olio di neem (azadiractina)",
        "sapone di Marsiglia per afidi",
        "zolfo o bicarbonato di potassio contro oidio",
        "Amblyseius cucumeris (acaro predatore) contro tripidi",
        "calcio in fruttificazione",
      ],
    },
  },
  {
    id: "peperoncino-habanero",
    name: "Peperoncino habanero",
    scientific: "Capsicum chinense",
    emoji: "🌶️",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "medium",
    sowing: [2, 3, 4],
    transplanting: [5, 6],
    harvest: [7, 8, 9, 10],
    companions: tagComp("peperoncino-habanero", ["basilico", "carota", "cipolla"]),
    antagonists: tagAnti("peperoncino-habanero", ["fagiolo"]),
    fertilizer: {
      demand: "high",
      type: [
        "letame maturo o compost in pre-trapianto",
        "macerato di consolida o ortica in copertura",
        "concime potassico in fruttificazione",
      ],
      schedule: "fondo + copertura ogni 15-20 giorni; alto K dai primi frutti",
      notes:
        "specie più lenta e termofila: preferisce temperature alte e stagione lunga",
    },
    treatments: {
      pests: ["afidi", "tripidi", "ragnetto rosso", "oidio", "marciume apicale"],
      remedies: [
        "olio di neem (azadiractina)",
        "sapone di Marsiglia per afidi",
        "Amblyseius cucumeris (acaro predatore) contro tripidi",
        "zolfo o bicarbonato di potassio contro oidio",
        "calcio in fruttificazione",
      ],
    },
  },
  {
    id: "melanzana",
    name: "Melanzana",
    scientific: "Solanum melongena",
    emoji: "🍆",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 60,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5],
    transplanting: [5, 6],
    harvest: [7, 8, 9],
    companions: tagComp("melanzana", ["basilico", "fagiolo", "peperone"]),
    antagonists: tagAnti("melanzana", ["pomodoro"]),
    fertilizer: {
      demand: "high",
      type: [
        "letame maturo o compost abbondante in pre-trapianto",
        "macerato di ortica in copertura",
        "concime potassico in fruttificazione",
      ],
      schedule:
        "fondo abbondante + copertura ogni 15 giorni; K alto dai primi frutti",
      notes: "ortaggio molto esigente, richiede terreni fertili e ben lavorati",
    },
    treatments: {
      pests: [
        "dorifora (Leptinotarsa decemlineata)",
        "afidi",
        "ragnetto rosso",
        "oidio",
        "Tuta absoluta",
      ],
      remedies: [
        "Bacillus thuringiensis tenebrionis o raccolta manuale per dorifora",
        "olio di neem",
        "zolfo contro oidio e ragnetto rosso",
        "sapone di Marsiglia",
      ],
    },
  },
  {
    id: "cipolla",
    name: "Cipolla",
    scientific: "Allium cepa",
    emoji: "🧅",
    category: "radice",
    perCell: 9,
    defaultSpacingCm: 12,
    sun: "full",
    water: "low",
    sowing: [2, 3, 4, 9, 10],
    harvest: [6, 7, 8],
    companions: tagComp("cipolla", ["pomodoro", "carota", "bietola", "lattuga"]),
    antagonists: tagAnti("cipolla", ["fagiolo", "pisello"]),
    fertilizer: {
      demand: "low",
      type: [
        "compost ben maturo (alla coltura precedente)",
        "fosforo e potassio in pre-semina",
        "solfato di potassio (apporto di zolfo)",
      ],
      schedule:
        "fondo minerale + 2-3 leggere coperture azotate alla ripresa vegetativa",
      notes:
        "MAI letame fresco (favorisce marciumi); evitare eccessi di azoto",
    },
    treatments: {
      pests: [
        "peronospora delle liliacee",
        "mosca della cipolla (Delia antiqua)",
        "tripidi (Thrips tabaci)",
        "Botrytis (marciume del colletto)",
      ],
      remedies: [
        "poltiglia bordolese contro peronospora",
        "rete antinsetto contro mosca",
        "olio di neem contro tripidi",
        "rotazione di 3-4 anni lontano da Allium",
      ],
    },
  },
  {
    id: "aglio",
    name: "Aglio",
    scientific: "Allium sativum",
    emoji: "🧄",
    category: "radice",
    perCell: 9,
    defaultSpacingCm: 12,
    sun: "full",
    water: "low",
    sowing: [10, 11, 12, 1, 2],
    harvest: [6, 7],
    companions: tagComp("aglio", ["pomodoro", "carota", "fragola", "rosa"]),
    antagonists: tagAnti("aglio", ["fagiolo", "pisello", "cavolo"]),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo (alla coltura precedente)",
        "concimi minerali a base di solfato",
      ],
      schedule:
        "concimazione esclusivamente minerale; azoto frazionato in copertura",
      notes:
        "MAI letame fresco (causa marciumi ai bulbi); zolfo importante per la qualità",
    },
    treatments: {
      pests: [
        "ruggine dell'aglio",
        "tignola dell'aglio",
        "Sclerotinia",
        "marciumi del bulbo",
      ],
      remedies: [
        "poltiglia bordolese in prevenzione",
        "rotazione di 3-4 anni",
        "drenaggio del terreno e bulbilli sani",
        "Trichoderma per il terreno",
      ],
    },
  },
  {
    id: "prezzemolo",
    name: "Prezzemolo",
    scientific: "Petroselinum crispum",
    emoji: "🌱",
    category: "aromatica",
    perCell: 4,
    defaultSpacingCm: 20,
    sun: "partial",
    water: "medium",
    sowing: [3, 4, 5, 6, 7],
    harvest: [5, 6, 7, 8, 9, 10],
    companions: tagComp("prezzemolo", ["pomodoro", "asparago"]),
    antagonists: tagAnti("prezzemolo", ["lattuga"]),
    fertilizer: {
      demand: "low",
      type: ["compost maturo in pre-semina"],
      schedule: "leggera concimazione di fondo",
      notes: "concimazioni eccessive riducono l'aroma",
    },
    treatments: {
      pests: ["afidi", "mosca della carota", "septoriosi"],
      remedies: [
        "olio di neem",
        "sapone di Marsiglia",
        "rete antinsetto",
        "evitare ristagni idrici",
      ],
    },
  },
  {
    id: "rucola",
    name: "Rucola",
    scientific: "Eruca sativa",
    emoji: "🌿",
    category: "foglia",
    perCell: 9,
    defaultSpacingCm: 12,
    sun: "partial",
    water: "medium",
    sowing: [3, 4, 5, 8, 9, 10],
    harvest: [4, 5, 6, 9, 10, 11],
    companions: tagComp("rucola", ["zucchina", "fagiolo", "lattuga"]),
    antagonists: tagAnti("rucola", []),
    fertilizer: {
      demand: "low",
      type: ["compost maturo in pre-semina"],
      schedule: "leggera concimazione di fondo, ciclo breve non richiede copertura",
      notes: "concimazione eccessiva accentua il sapore piccante",
    },
    treatments: {
      pests: ["altica (pulce di terra)", "afidi", "lumache"],
      remedies: [
        "rete antinsetto a maglia fine",
        "zeolite cubana micronizzata",
        "olio di neem",
        "fosfato ferrico contro lumache",
      ],
    },
  },
  {
    id: "spinacio",
    name: "Spinacio",
    scientific: "Spinacia oleracea",
    emoji: "🥬",
    category: "foglia",
    perCell: 9,
    defaultSpacingCm: 15,
    sun: "partial",
    water: "high",
    sowing: [2, 3, 8, 9, 10],
    harvest: [4, 5, 10, 11],
    companions: tagComp("spinacio", ["fragola", "fagiolo", "cavolo"]),
    antagonists: tagAnti("spinacio", []),
    fertilizer: {
      demand: "medium",
      type: [
        "compost maturo in pre-semina",
        "concime azotato leggero in copertura",
      ],
      schedule: "fondo + 1 leggera copertura per produzione di foglie",
      notes:
        "ricco di nitrati: evitare eccessi di azoto a ridosso della raccolta",
    },
    treatments: {
      pests: ["afidi", "peronospora", "mosca minatrice"],
      remedies: [
        "sapone di Marsiglia",
        "poltiglia bordolese",
        "olio di neem / Spinosad",
        "rotazione di 3 anni",
      ],
    },
  },
  {
    id: "fagiolo",
    name: "Fagiolo",
    scientific: "Phaseolus vulgaris",
    emoji: "🫘",
    category: "leguminosa",
    perCell: 4,
    defaultSpacingCm: 15,
    sun: "full",
    water: "medium",
    sowing: [4, 5, 6, 7],
    harvest: [7, 8, 9],
    companions: tagComp("fagiolo", ["zucchina", "carota", "mais", "rucola"]),
    antagonists: tagAnti("fagiolo", ["aglio", "cipolla", "porro"]),
    fertilizer: {
      demand: "fixer",
      type: [
        "compost maturo o letame pellettato in pre-semina (modesto)",
        "potassio (cenere di legna) e fosforo in fondo",
        "azoto starter modesto solo se carenza visibile",
      ],
      schedule:
        "leggera concimazione di fondo (rapporto N:K = 1:3); no copertura azotata",
      notes:
        "azotofissatrice tramite Rhizobium; eccessi di azoto favoriscono ruggine e Botrytis",
    },
    treatments: {
      pests: [
        "afidi neri",
        "ruggine del fagiolo",
        "antracnosi",
        "Botrytis",
        "tonchio",
      ],
      remedies: [
        "olio di neem / sapone di Marsiglia per afidi",
        "poltiglia bordolese in prevenzione",
        "evitare eccessi di azoto e bagnature fogliari",
        "rotazione di 3 anni",
      ],
    },
  },
  {
    id: "pisello",
    name: "Pisello",
    scientific: "Pisum sativum",
    emoji: "🟢",
    category: "leguminosa",
    perCell: 4,
    defaultSpacingCm: 8,
    sun: "partial",
    water: "medium",
    sowing: [2, 3, 9, 10],
    harvest: [5, 6, 11],
    companions: tagComp("pisello", ["carota", "rapa", "cetriolo"]),
    antagonists: tagAnti("pisello", ["aglio", "cipolla"]),
    fertilizer: {
      demand: "fixer",
      type: [
        "compost maturo in pre-semina (modesto)",
        "potassio (cenere di legna) in fondo",
      ],
      schedule: "leggera concimazione di fondo; nessuna copertura azotata",
      notes:
        "azotofissatrice; arricchisce di azoto il terreno per le colture successive",
    },
    treatments: {
      pests: [
        "tonchio del pisello (Bruchus pisorum)",
        "afidi",
        "oidio",
        "Sclerotinia",
        "tortrice",
      ],
      remedies: [
        "semine precoci per evitare il volo del tonchio",
        "olio di neem / sapone di Marsiglia",
        "zolfo contro oidio",
        "rotazione di 3-4 anni",
      ],
    },
  },
  {
    id: "cetriolo",
    name: "Cetriolo",
    scientific: "Cucumis sativus",
    emoji: "🥒",
    category: "frutto",
    perCell: 2,
    defaultSpacingCm: 40,
    sun: "full",
    water: "high",
    sowing: [4, 5, 6],
    harvest: [6, 7, 8, 9],
    companions: tagComp("cetriolo", ["fagiolo", "pisello", "lattuga"]),
    antagonists: tagAnti("cetriolo", ["zucchina", "patata"]),
    fertilizer: {
      demand: "high",
      type: [
        "compost o letame maturo in pre-impianto",
        "macerato di ortica in copertura",
        "concime potassico in fruttificazione",
      ],
      schedule: "fondo + copertura ogni 20 giorni",
      notes: "ama terreni ricchi e ben drenati; pacciamatura utile",
    },
    treatments: {
      pests: [
        "oidio",
        "peronospora",
        "afidi",
        "tripidi",
        "Fusarium / Verticillium (avvizzimenti)",
      ],
      remedies: [
        "zolfo o bicarbonato di sodio",
        "poltiglia bordolese",
        "Trichoderma harzianum per il terreno",
        "olio di neem",
        "rotazione di almeno 3 anni",
      ],
    },
  },
  {
    id: "ravanello",
    name: "Ravanello",
    scientific: "Raphanus sativus",
    emoji: "🌶️",
    category: "radice",
    perCell: 16,
    defaultSpacingCm: 5,
    sun: "partial",
    water: "medium",
    sowing: [3, 4, 5, 6, 7, 8, 9],
    harvest: [4, 5, 6, 7, 8, 9, 10],
    companions: tagComp("ravanello", ["lattuga", "cetriolo", "carota"]),
    antagonists: tagAnti("ravanello", []),
    fertilizer: {
      demand: "low",
      type: ["compost maturo in pre-semina (poco)"],
      schedule:
        "ciclo brevissimo: solo concimazione di fondo, nessuna copertura",
      notes:
        "evitare letame fresco e azoto in eccesso (radici legnose o cave)",
    },
    treatments: {
      pests: [
        "altica (pulce di terra)",
        "afidi",
        "lumache",
        "mosca del cavolo",
      ],
      remedies: [
        "rete antinsetto a maglia fine",
        "zeolite cubana micronizzata",
        "olio di neem",
        "fosfato ferrico contro lumache",
      ],
    },
  },
  {
    id: "bietola",
    name: "Bietola",
    scientific: "Beta vulgaris",
    emoji: "🥬",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 25,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5, 8, 9],
    harvest: [5, 6, 7, 10, 11],
    companions: tagComp("bietola", ["cipolla", "cavolo"]),
    antagonists: tagAnti("bietola", []),
    fertilizer: {
      demand: "medium",
      type: [
        "compost maturo in pre-trapianto",
        "concime azotato in copertura per la produzione fogliare",
      ],
      schedule: "fondo + copertura ogni 30 giorni",
      notes: "ortaggio rustico, raccolta scalare delle foglie esterne",
    },
    treatments: {
      pests: ["afidi", "altica", "mosca della bietola", "cercosporiosi"],
      remedies: [
        "sapone di Marsiglia",
        "olio di neem",
        "rete antinsetto",
        "poltiglia bordolese contro cercosporiosi",
      ],
    },
  },
  {
    id: "cavolo",
    name: "Cavolo",
    scientific: "Brassica oleracea",
    emoji: "🥬",
    category: "ortaggio",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5, 6, 7],
    harvest: [9, 10, 11, 12],
    companions: tagComp("cavolo", ["bietola", "spinacio", "menta"]),
    antagonists: tagAnti("cavolo", ["pomodoro", "aglio", "fragola"]),
    fertilizer: CABBAGE_FERTILIZER,
    treatments: CABBAGE_TREATMENTS,
  },
  {
    id: "cavolo-cappuccio",
    name: "Cavolo cappuccio",
    scientific: "Brassica oleracea var. capitata",
    emoji: "🥬",
    category: "ortaggio",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5, 6, 7],
    harvest: [9, 10, 11, 12],
    companions: tagComp("cavolo-cappuccio", ["bietola", "spinacio", "menta"]),
    antagonists: tagAnti("cavolo-cappuccio", ["pomodoro", "aglio", "fragola"]),
    fertilizer: CABBAGE_FERTILIZER,
    treatments: CABBAGE_TREATMENTS,
  },
  {
    id: "cavolo-cappuccio-viola",
    name: "Cavolo cappuccio viola",
    scientific: "Brassica oleracea var. capitata f. rubra",
    emoji: "🥬",
    category: "ortaggio",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5, 6, 7],
    harvest: [9, 10, 11, 12],
    companions: tagComp("cavolo-cappuccio-viola", ["bietola", "spinacio", "menta"]),
    antagonists: tagAnti("cavolo-cappuccio-viola", ["pomodoro", "aglio", "fragola"]),
    fertilizer: CABBAGE_FERTILIZER,
    treatments: CABBAGE_TREATMENTS,
  },
  {
    id: "cavolo-verza",
    name: "Cavolo verza",
    scientific: "Brassica oleracea var. sabauda",
    emoji: "🥬",
    category: "ortaggio",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5, 6, 7],
    harvest: [9, 10, 11, 12],
    companions: tagComp("cavolo-verza", ["bietola", "spinacio", "menta"]),
    antagonists: tagAnti("cavolo-verza", ["pomodoro", "aglio", "fragola"]),
    fertilizer: CABBAGE_FERTILIZER,
    treatments: CABBAGE_TREATMENTS,
  },
  {
    id: "cavolo-nero",
    name: "Cavolo nero",
    scientific: "Brassica oleracea var. acephala",
    emoji: "🥬",
    category: "ortaggio",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5, 6, 7],
    harvest: [10, 11, 12, 1, 2],
    companions: tagComp("cavolo-nero", ["bietola", "spinacio", "menta"]),
    antagonists: tagAnti("cavolo-nero", ["pomodoro", "aglio", "fragola"]),
    fertilizer: CABBAGE_FERTILIZER,
    treatments: CABBAGE_TREATMENTS,
  },
  {
    id: "fragola",
    name: "Fragola",
    scientific: "Fragaria",
    emoji: "🍓",
    category: "frutto",
    perCell: 4,
    defaultSpacingCm: 30,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 9, 10],
    harvest: [5, 6, 7],
    companions: tagComp("fragola", ["lattuga", "spinacio", "aglio"]),
    antagonists: tagAnti("fragola", ["cavolo"]),
    fertilizer: {
      demand: "high",
      type: [
        "letame maturo o compost in pre-impianto",
        "stallatico pellettato in copertura",
        "concime ricco di potassio in fioritura/fruttificazione",
      ],
      schedule:
        "fondo + copertura potassica all'inizio della fioritura e dopo ogni raccolto",
      notes: "pH 5,5-6,5; pacciamatura con paglia per proteggere i frutti",
    },
    treatments: {
      pests: [
        "oidio",
        "Botrytis (muffa grigia)",
        "afidi",
        "tripidi",
        "ragnetto rosso",
      ],
      remedies: [
        "zolfo contro oidio",
        "Bacillus subtilis o poltiglia bordolese contro Botrytis",
        "olio di neem / sapone di Marsiglia",
        "buona aerazione e pacciamatura",
      ],
    },
  },
  {
    id: "fragola-di-bosco",
    name: "Fragola di bosco",
    scientific: "Fragaria vesca",
    emoji: "🍓",
    category: "frutti-di-bosco",
    perCell: 4,
    defaultSpacingCm: 25,
    sun: "partial",
    water: "medium",
    sowing: [3, 4, 9, 10],
    harvest: [5, 6, 7, 8],
    companions: tagComp("fragola-di-bosco", ["aglio", "cipolla", "lattuga"]),
    antagonists: tagAnti("fragola-di-bosco", ["cavolo"]),
  },
  {
    id: "mirtillo",
    name: "Mirtillo",
    scientific: "Vaccinium corymbosum",
    emoji: "🫐",
    category: "frutti-di-bosco",
    perCell: 1,
    defaultSpacingCm: 90,
    sun: "full",
    water: "medium",
    sowing: [2, 3, 10, 11],
    harvest: [6, 7, 8],
    companions: tagComp("mirtillo", []),
    antagonists: tagAnti("mirtillo", []),
  },
  {
    id: "mirtillo-rosso",
    name: "Mirtillo rosso",
    scientific: "Vaccinium vitis-idaea",
    emoji: "🫐",
    category: "frutti-di-bosco",
    perCell: 4,
    defaultSpacingCm: 35,
    sun: "partial",
    water: "medium",
    sowing: [2, 3, 10, 11],
    harvest: [8, 9, 10],
    companions: tagComp("mirtillo-rosso", []),
    antagonists: tagAnti("mirtillo-rosso", []),
  },
  {
    id: "ribes-rosso",
    name: "Ribes rosso",
    scientific: "Ribes rubrum",
    emoji: "🍇",
    category: "frutti-di-bosco",
    perCell: 1,
    defaultSpacingCm: 120,
    sun: "full",
    water: "medium",
    sowing: [2, 3, 10, 11],
    harvest: [6, 7],
    companions: tagComp("ribes-rosso", []),
    antagonists: tagAnti("ribes-rosso", []),
  },
  {
    id: "ribes-nero",
    name: "Ribes nero",
    scientific: "Ribes nigrum",
    emoji: "🍇",
    category: "frutti-di-bosco",
    perCell: 1,
    defaultSpacingCm: 120,
    sun: "full",
    water: "medium",
    sowing: [2, 3, 10, 11],
    harvest: [6, 7],
    companions: tagComp("ribes-nero", []),
    antagonists: tagAnti("ribes-nero", []),
  },
  {
    id: "uva-spina",
    name: "Uva spina",
    scientific: "Ribes uva-crispa",
    emoji: "🍇",
    category: "frutti-di-bosco",
    perCell: 1,
    defaultSpacingCm: 120,
    sun: "full",
    water: "medium",
    sowing: [2, 3, 10, 11],
    harvest: [6, 7],
    companions: tagComp("uva-spina", []),
    antagonists: tagAnti("uva-spina", []),
  },
  {
    id: "salvia",
    name: "Salvia",
    scientific: "Salvia officinalis",
    emoji: "🌿",
    category: "aromatica",
    perCell: 1,
    defaultSpacingCm: 40,
    sun: "full",
    water: "low",
    sowing: [3, 4, 5],
    harvest: [5, 6, 7, 8, 9, 10],
    companions: tagComp("salvia", ["cavolo", "carota", "rosmarino"]),
    antagonists: tagAnti("salvia", ["cetriolo"]),
    fertilizer: {
      demand: "low",
      type: ["compost maturo all'impianto"],
      schedule: "fondo leggero, nessuna copertura; potatura primaverile",
      notes:
        "preferisce terreni poveri e ben drenati; eccessi d'acqua/concime causano marciumi",
    },
    treatments: {
      pests: ["oidio", "afidi", "cicaline", "marciume del colletto"],
      remedies: [
        "zolfo contro oidio",
        "olio di neem / sapone di Marsiglia",
        "potature di sfoltimento per aerare",
        "drenaggio del terreno",
      ],
    },
  },
  {
    id: "timo",
    name: "Timo",
    scientific: "Thymus vulgaris",
    emoji: "🌿",
    category: "aromatica",
    perCell: 4,
    defaultSpacingCm: 25,
    sun: "full",
    water: "low",
    sowing: [3, 4, 5],
    transplanting: [4, 5, 6, 9, 10],
    harvest: [5, 6, 7, 8, 9, 10],
    companions: tagComp("timo", ["pomodoro", "cavolo", "carota", "salvia", "origano", "rosmarino"]),
    antagonists: tagAnti("timo", []),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo molto leggero o stallatico pellettato in pre-impianto",
        "terriccio sabbioso: niente terreni ricchi e umidi",
      ],
      schedule:
        "solo fondo; in vaso fertilizzante organico liquido diluito ogni 15 giorni in crescita",
      notes:
        "piante da terreno povero e ben drenato; eccessi di azoto e acqua riducono l'aroma e favoriscono marciumi",
    },
    treatments: {
      pests: ["afidi", "oidio", "marciume radicale (ristagni)", "ragnetto rosso"],
      remedies: [
        "drenaggio e sole pieno",
        "zolfo per oidio",
        "sapone molle / olio di neem per afidi",
        "potatura a fine inverno per aerare il cespo",
      ],
    },
  },
  {
    id: "maggiorana",
    name: "Maggiorana",
    scientific: "Origanum majorana",
    emoji: "🌿",
    category: "aromatica",
    perCell: 4,
    defaultSpacingCm: 22,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 5],
    transplanting: [4, 5, 6],
    harvest: [6, 7, 8, 9],
    companions: tagComp("maggiorana", ["pomodoro", "melanzana", "origano", "timo"]),
    antagonists: tagAnti("maggiorana", []),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo moderato in pre-trapianto",
        "fertilizzante organico liquido in vaso ogni 10-14 giorni",
      ],
      schedule:
        "fondo alla semina/trapianto; poca copertura: troppo azoto diluisce l'aroma",
      notes:
        "meno rustica dell'origano: in zone fredde coltivarla come annuale o in vaso al riparo",
    },
    treatments: {
      pests: ["afidi", "oidio", "marciumi se ristagni idrici"],
      remedies: [
        "buona aereazione tra le piante",
        "olio di neem / sapone di Marsiglia",
        "zolfo in prevenzione su oidio",
      ],
    },
  },
  {
    id: "origano",
    name: "Origano",
    scientific: "Origanum vulgare",
    emoji: "🌿",
    category: "aromatica",
    perCell: 4,
    defaultSpacingCm: 28,
    sun: "full",
    water: "low",
    sowing: [3, 4, 5],
    transplanting: [4, 5, 6, 9, 10],
    harvest: [5, 6, 7, 8, 9, 10],
    companions: tagComp("origano", ["pomodoro", "peperone", "melanzana", "timo", "maggiorana"]),
    antagonists: tagAnti("origano", []),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo leggero in pre-impianto",
        "sostanza organica moderata: preferisce suoli asciutti",
      ],
      schedule:
        "concimazione di fondo; raramente coperture; potatura leggera a primavera",
      notes:
        "perenne rustica; evitare ristagni e terreni troppo fertili (vegetazione in eccesso, meno aroma)",
    },
    treatments: {
      pests: ["afidi", "oidio", "ragnetto rosso in siccità"],
      remedies: [
        "irrigazioni profonde ma distanziate",
        "olio di neem",
        "zolfo contro oidio",
      ],
    },
  },
  {
    id: "finocchietto",
    name: "Finocchietto",
    scientific: "Foeniculum vulgare (da foglia e seme)",
    emoji: "🌼",
    category: "aromatica",
    perCell: 1,
    defaultSpacingCm: 30,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 5, 6, 7],
    transplanting: [4, 5, 6],
    harvest: [5, 6, 7, 8, 9, 10, 11],
    companions: tagComp("finocchietto", ["lattuga", "cetriolo", "pisello", "salvia", "porro"]),
    antagonists: tagAnti("finocchietto", ["pomodoro", "fagiolo", "cavolo", "finocchio"]),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo leggero in pre-semina",
        "eventuale macerato di ortica diluito in ripresa vegetativa",
      ],
      schedule:
        "fondo modesto; poche coperture (favorisce monta a seme e meno aroma)",
      notes:
        "stessa specie del finocchio da bulbo ma uso foglie/semi; evitare vicinanza al bulbo per gestione e rotazione Apiaceae",
    },
    treatments: {
      pests: ["afidi", "farfallina del finocchio", "lumache su giovani piante"],
      remedies: [
        "sapone molle / olio di neem",
        "rete antinsetto",
        "fosfato ferrico per lumache",
      ],
    },
  },
  {
    id: "rosmarino",
    name: "Rosmarino",
    scientific: "Salvia rosmarinus",
    emoji: "🌿",
    category: "aromatica",
    perCell: 1,
    defaultSpacingCm: 60,
    sun: "full",
    water: "low",
    sowing: [3, 4, 5],
    transplanting: [4, 5, 6, 9, 10],
    harvest: [4, 5, 6, 7, 8, 9, 10, 11],
    companions: tagComp("rosmarino", ["carota", "cavolo", "salvia", "timo", "lavanda"]),
    antagonists: tagAnti("rosmarino", []),
    fertilizer: {
      demand: "low",
      type: [
        "terriccio drenante con poca sostanza organica",
        "pollina o compost maturo molto leggero all'impianto",
      ],
      schedule:
        "apporti minimi; in vaso concime organico liquido diluito 1-2 volte in stagione",
      notes:
        "siccofilo mediterraneo; ristagni e terreni troppo ricchi causano stress e marciumi",
    },
    treatments: {
      pests: ["afidi", "cicaline", "marciume del colletto", "ragnetto rosso"],
      remedies: [
        "drenaggio e sole",
        "olio di neem",
        "potatura di riforma dopo fioritura se necessario",
      ],
    },
  },
  {
    id: "menta",
    name: "Menta",
    scientific: "Mentha × piperita",
    emoji: "🌿",
    category: "aromatica",
    perCell: 1,
    defaultSpacingCm: 35,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5],
    transplanting: [4, 5, 6, 9, 10],
    harvest: [5, 6, 7, 8, 9, 10],
    companions: tagComp("menta", ["bietola", "spinacio", "cavolo", "pisello"]),
    antagonists: tagAnti("menta", []),
    fertilizer: {
      demand: "medium",
      type: [
        "compost maturo in pre-impianto (vaso o zolla contenuta)",
        "fertilizzante organico liquido ogni 2-3 settimane in contenitore",
      ],
      schedule:
        "fondo + coperture leggere: alta evapotraspirazione in zone umide",
      notes:
        "rizomi invasivi: preferire barriera sotterranea o coltivazione in vaso",
    },
    treatments: {
      pests: ["rugiadina (oidio)", "afidi", "larve su foglie"],
      remedies: [
        "zolfo contro oidio",
        "sapone di Marsiglia",
        "tagli frequenti per rinnovare le foglie",
      ],
    },
  },
  {
    id: "dragoncello",
    name: "Dragoncello (estragon)",
    scientific: "Artemisia dracunculus",
    emoji: "🌿",
    category: "aromatica",
    perCell: 1,
    defaultSpacingCm: 30,
    sun: "full",
    water: "medium",
    sowing: [3, 4],
    transplanting: [4, 5, 6],
    harvest: [6, 7, 8, 9],
    companions: tagComp("dragoncello", ["lattuga", "fagiolo", "pisello"]),
    antagonists: tagAnti("dragoncello", []),
    fertilizer: {
      demand: "low",
      type: ["compost maturo leggero in pre-trapianto"],
      schedule:
        "terreno fresco ma drenato; evitare eccessi di azoto (aroma più debole)",
      notes:
        "molte varietà da seme sono poco aromatiche; per uso culinario spesso divisione o talee da cloni francesi",
    },
    treatments: {
      pests: ["afidi", "oidio", "marciumi in ristagni"],
      remedies: [
        "olio di neem",
        "zolfo",
        "drenaggio e sole",
      ],
    },
  },
  {
    id: "coriandolo",
    name: "Coriandolo",
    scientific: "Coriandrum sativum",
    emoji: "🌿",
    category: "aromatica",
    perCell: 9,
    defaultSpacingCm: 15,
    sun: "partial",
    water: "medium",
    sowing: [3, 4, 5, 8, 9],
    transplanting: [4, 5, 9],
    harvest: [5, 6, 7, 9, 10],
    companions: tagComp("coriandolo", ["lattuga", "spinacio", "pomodoro", "pisello"]),
    antagonists: tagAnti("coriandolo", []),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo leggero in pre-semina",
        "no letame fresco (accentua prefioritura)",
      ],
      schedule:
        "semina a cadenza quindicinale per foglie tenere; concimi azotati moderati",
      notes:
        "prefioritura rapida con caldo e giornate lunghe: mezze ombre e semine scalari",
    },
    treatments: {
      pests: ["afidi", "altica", "marciumi se troppo umido"],
      remedies: [
        "sapone molle",
        "rete antinsetto",
        "areazione e drenaggio",
      ],
    },
  },
  {
    id: "aneto",
    name: "Aneto",
    scientific: "Anethum graveolens",
    emoji: "🌿",
    category: "aromatica",
    perCell: 4,
    defaultSpacingCm: 22,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 5, 6],
    transplanting: [4, 5],
    harvest: [6, 7, 8, 9],
    companions: tagComp("aneto", ["cetriolo", "lattuga", "cipolla", "porro"]),
    antagonists: tagAnti("aneto", ["carota", "finocchio"]),
    fertilizer: {
      demand: "low",
      type: ["compost maturo leggero in pre-semina"],
      schedule:
        "ciclo breve: fondo sufficiente; evitare coperture azotate tardive",
      notes:
        "trapianto sconsigliato se radice già lunga; preferire semina diretta o trapianto giovanissimo",
    },
    treatments: {
      pests: ["afidi", "larve di lepidotteri", "peronospora in umidità"],
      remedies: [
        "sapone di Marsiglia / olio di neem",
        "Bacillus thuringiensis kurstaki per bruchi",
        "buona aereazione",
      ],
    },
  },
  {
    id: "erba-cipollina",
    name: "Erba cipollina",
    scientific: "Allium schoenoprasum",
    emoji: "🌿",
    category: "aromatica",
    perCell: 9,
    defaultSpacingCm: 15,
    sun: "full",
    water: "medium",
    sowing: [3, 4, 5],
    transplanting: [4, 5, 6],
    harvest: [5, 6, 7, 8, 9, 10],
    companions: tagComp("erba-cipollina", ["carota", "pomodoro", "lattuga", "fragola"]),
    antagonists: tagAnti("erba-cipollina", ["fagiolo", "pisello"]),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo moderato in pre-impianto",
        "fosforo e potassio leggeri",
      ],
      schedule:
        "simile alle altre liliacee: fondo + 1-2 coperture leggere in stagione",
      notes:
        "perenne: rinnovare cespi ogni 3-4 anni per vigoria; evitare azoto eccessivo",
    },
    treatments: {
      pests: ["tripidi", "muffe da eccesso umidità", "mosca delle liliacee"],
      remedies: [
        "olio di neem per tripidi",
        "drenaggio",
        "rotazione con altre famiglie",
      ],
    },
  },
  {
    id: "melissa",
    name: "Melissa",
    scientific: "Melissa officinalis",
    emoji: "🌿",
    category: "aromatica",
    perCell: 1,
    defaultSpacingCm: 30,
    sun: "partial",
    water: "medium",
    sowing: [4, 5],
    transplanting: [4, 5, 6, 9],
    harvest: [6, 7, 8, 9, 10],
    companions: tagComp("melissa", ["pomodoro", "cavolo", "menta"]),
    antagonists: tagAnti("melissa", []),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo in pre-trapianto",
        "macerato di ortica diluito occasionale",
      ],
      schedule:
        "fondo + rare coperture; tagli frequenti stimolano foglie tenere",
      notes:
        "preferisce mezz'ombra in clima caldo; può diventare invasiva: contenimento consigliato",
    },
    treatments: {
      pests: ["afidi", "oidio", "tripidi"],
      remedies: [
        "sapone molle",
        "zolfo",
        "sfoltimento per aerazione",
      ],
    },
  },
  {
    id: "lavanda",
    name: "Lavanda",
    scientific: "Lavandula angustifolia",
    emoji: "💜",
    category: "aromatica",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "low",
    sowing: [3, 4],
    transplanting: [5, 6, 9, 10],
    harvest: [6, 7, 8],
    companions: tagComp("lavanda", ["rosmarino", "salvia", "timo"]),
    antagonists: tagAnti("lavanda", []),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo leggero all'impianto",
        "sabbia o ghiaia per drenaggio",
      ],
      schedule:
        "terreno povero; nessuna copertura azotata in eccesso (legnosità)",
      notes:
        "potatura leggera dopo fioritura; evitare ristagni invernali su terreni argillosi",
    },
    treatments: {
      pests: ["afidi", "ragnetto rosso", "marciume del colletto"],
      remedies: [
        "drenaggio e sole",
        "olio di neem",
        "evitare annaffiature sulla chioma",
      ],
    },
  },
  {
    id: "fava",
    name: "Fava",
    scientific: "Vicia faba",
    emoji: "🫘",
    category: "leguminosa",
    perCell: 4,
    defaultSpacingCm: 20,
    sun: "full",
    water: "medium",
    sowing: [10, 11, 2, 3],
    harvest: [5, 6, 7],
    companions: tagComp("fava", ["lattuga", "patata", "ravanello", "songino", "carota"]),
    antagonists: tagAnti("fava", ["aglio", "cipolla", "porro", "scalogno", "fagiolo", "pisello", "finocchio"]),
    fertilizer: {
      demand: "fixer",
      type: [
        "compost maturo in pre-semina (modesto)",
        "fosforo (50 kg/ha P2O5) e potassio in fondo",
        "azoto starter solo se necessario (20-30 kg/ha)",
      ],
      schedule:
        "leggera concimazione di fondo (rapporto N:K = 1:2); nessuna copertura",
      notes:
        "azotofissatrice; eccellente coltura miglioratrice; tollera pH fino a 8,4",
    },
    treatments: {
      pests: [
        "afide nero della fava (Aphis fabae)",
        "tonchio della fava",
        "ruggine",
        "Botrytis",
      ],
      remedies: [
        "cimatura degli apici (concentrano gli afidi)",
        "sapone di Marsiglia / olio di neem",
        "poltiglia bordolese in prevenzione",
        "evitare eccessi di azoto",
      ],
    },
  },
  {
    id: "bietola-taglio",
    name: "Bietola da taglio",
    scientific: "Beta vulgaris var. cicla",
    emoji: "🥬",
    category: "foglia",
    perCell: 9,
    defaultSpacingCm: 15,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5, 6, 7, 8, 9],
    harvest: [4, 5, 6, 7, 8, 9, 10, 11],
    companions: tagComp("bietola-taglio", ["cipolla", "carota", "ravanello", "cavolo"]),
    antagonists: tagAnti("bietola-taglio", ["spinacio", "porro"]),
    fertilizer: {
      demand: "medium",
      type: [
        "compost maturo in pre-semina",
        "concime azotato in copertura dopo ogni taglio",
      ],
      schedule:
        "fondo + leggera copertura azotata dopo ogni taglio (ogni 20-30 giorni)",
      notes: "ricaccia rapidamente dopo il taglio se ben nutrita",
    },
    treatments: {
      pests: ["afidi", "altica", "lumache", "cercosporiosi"],
      remedies: [
        "sapone di Marsiglia",
        "rete antinsetto",
        "fosfato ferrico",
        "poltiglia bordolese in prevenzione",
      ],
    },
  },
  {
    id: "finocchio",
    name: "Finocchio",
    scientific: "Foeniculum vulgare",
    emoji: "🌿",
    category: "ortaggio",
    perCell: 1,
    defaultSpacingCm: 30,
    sun: "full",
    water: "high",
    sowing: [3, 4, 6, 7, 8],
    harvest: [6, 7, 9, 10, 11],
    companions: tagComp("finocchio", ["cetriolo", "lattuga", "pisello", "salvia", "porro"]),
    antagonists: tagAnti("finocchio", ["pomodoro", "fagiolo", "cavolo", "aneto"]),
    fertilizer: {
      demand: "medium",
      type: [
        "compost maturo in pre-trapianto",
        "leggera copertura potassica per la formazione del grumolo",
      ],
      schedule: "fondo + rincalzatura per imbianchimento del bulbo",
      notes:
        "irrigazione regolare per evitare montata a seme; no sbalzi idrici",
    },
    treatments: {
      pests: ["afidi", "mosca del finocchio", "lumache"],
      remedies: [
        "olio di neem",
        "sapone di Marsiglia",
        "fosfato ferrico contro lumache",
        "rete antinsetto",
      ],
    },
  },
  {
    id: "scalogno",
    name: "Scalogno",
    scientific: "Allium ascalonicum",
    emoji: "🧅",
    category: "radice",
    perCell: 9,
    defaultSpacingCm: 15,
    sun: "full",
    water: "low",
    sowing: [10, 11, 2, 3],
    harvest: [6, 7],
    companions: tagComp("scalogno", ["carota", "lattuga", "fragola", "bietola", "pomodoro"]),
    antagonists: tagAnti("scalogno", ["fagiolo", "pisello", "cavolo", "fava"]),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo (2-3 kg/m² distribuito 3-4 mesi prima)",
        "fosforo e potassio in pre-impianto",
      ],
      schedule:
        "fondo + 2-3 leggere coperture (30-40% alla preparazione, resto a ripresa)",
      notes:
        "evitare azoto tardivo: ritarda maturazione e favorisce malattie",
    },
    treatments: {
      pests: [
        "peronospora delle liliacee",
        "Botrytis (marciume del colletto)",
        "Fusarium",
        "tripidi",
        "mosca della cipolla (Delia)",
      ],
      remedies: [
        "poltiglia bordolese in prevenzione",
        "rotazione di 3-4 anni senza Allium",
        "rete antinsetto",
        "olio di neem per tripidi",
      ],
    },
  },
  {
    id: "porro",
    name: "Porro",
    scientific: "Allium porrum",
    emoji: "🌱",
    category: "radice",
    perCell: 9,
    defaultSpacingCm: 15,
    sun: "full",
    water: "medium",
    sowing: [2, 3, 4, 7, 8],
    harvest: [9, 10, 11, 12, 1, 2],
    companions: tagComp("porro", ["carota", "cavolo", "finocchio", "lattuga", "pomodoro", "sedano"]),
    antagonists: tagAnti("porro", ["fagiolo", "pisello", "bietola"]),
    fertilizer: {
      demand: "low",
      type: [
        "compost maturo in pre-trapianto",
        "leggera copertura azotata in crescita",
      ],
      schedule: "fondo + rincalzature successive per imbianchimento del fusto",
      notes: "evitare letame fresco; ciclo lungo, terreno deve restare ricco",
    },
    treatments: {
      pests: [
        "tignola del porro (Acrolepiopsis assectella)",
        "mosca del porro (Phytomyza gymnostoma)",
        "ruggine del porro",
        "tripidi",
      ],
      remedies: [
        "rete antinsetto a maglia fine",
        "Bacillus thuringiensis kurstaki contro tignola",
        "rotazione di 3-4 anni",
        "poltiglia bordolese per ruggine",
      ],
    },
  },
  {
    id: "sedano",
    name: "Sedano",
    scientific: "Apium graveolens",
    emoji: "🥬",
    category: "ortaggio",
    perCell: 4,
    defaultSpacingCm: 25,
    sun: "partial",
    water: "high",
    sowing: [3, 4, 5],
    harvest: [8, 9, 10, 11],
    companions: tagComp("sedano", ["cavolo", "porro", "pomodoro", "fagiolo", "cetriolo", "lattuga", "spinacio"]),
    antagonists: tagAnti("sedano", ["carota", "prezzemolo", "mais"]),
    fertilizer: {
      demand: "high",
      type: [
        "letame maturo o compost abbondante in pre-trapianto",
        "macerato di ortica in copertura",
      ],
      schedule:
        "fondo abbondante + copertura azotata frazionata ogni 20 giorni",
      notes:
        "irrigazione costante; rincalzatura per imbianchire le coste",
    },
    treatments: {
      pests: [
        "mosca del sedano",
        "afidi",
        "septoriosi",
        "marciume del cuore",
      ],
      remedies: [
        "rete antinsetto",
        "olio di neem",
        "poltiglia bordolese contro septoriosi",
        "irrigazione regolare e drenaggio",
      ],
    },
  },
  {
    id: "radicchio",
    name: "Radicchio",
    scientific: "Cichorium intybus var. foliosum",
    emoji: "🥬",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 30,
    sun: "partial",
    water: "medium",
    sowing: [3, 4, 5, 6, 7, 8],
    harvest: [6, 7, 9, 10, 11, 12],
    companions: tagComp("radicchio", ["carota", "fagiolo", "lattuga", "finocchio", "pomodoro"]),
    antagonists: tagAnti("radicchio", ["zucchina"]),
    fertilizer: {
      demand: "medium",
      type: ["compost maturo in pre-trapianto", "macerato di ortica leggero"],
      schedule: "fondo + leggera copertura azotata in vegetazione",
      notes:
        "evitare eccessi di azoto: ostacolano la formazione del grumolo e accentuano l'amaro",
    },
    treatments: {
      pests: [
        "lumache e limacce",
        "afidi",
        "nottua",
        "marciume del cuore",
        "Sclerotinia",
      ],
      remedies: [
        "fosfato ferrico contro lumache",
        "sapone di Marsiglia",
        "Bacillus thuringiensis kurstaki contro nottua",
        "irrigazione regolare evitando ristagni",
      ],
    },
  },
  {
    id: "indivia",
    name: "Indivia riccia",
    scientific: "Cichorium endivia var. crispum",
    emoji: "🥗",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 30,
    sun: "partial",
    water: "high",
    sowing: [6, 7, 8, 9],
    harvest: [9, 10, 11, 12],
    companions: tagComp("indivia", ["cicoria", "porro", "lattuga", "carota"]),
    antagonists: tagAnti("indivia", ["cavolo", "finocchio"]),
    fertilizer: {
      demand: "medium",
      type: [
        "compost maturo in pre-trapianto",
        "leggera copertura azotata in crescita",
      ],
      schedule: "fondo + 1 copertura prima dell'imbianchimento",
      notes:
        "imbianchimento legando i cespi 10-15 giorni prima della raccolta",
    },
    treatments: {
      pests: [
        "afidi",
        "lumache",
        "nottua",
        "marciume del cuore",
        "Sclerotinia",
      ],
      remedies: [
        "fosfato ferrico",
        "sapone di Marsiglia",
        "Bacillus thuringiensis kurstaki",
        "buon drenaggio",
      ],
    },
  },
  {
    id: "scarola",
    name: "Scarola",
    scientific: "Cichorium endivia var. latifolia",
    emoji: "🥗",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 35,
    sun: "partial",
    water: "high",
    sowing: [6, 7, 8, 9],
    harvest: [9, 10, 11, 12],
    companions: tagComp("scarola", ["porro", "carota", "lattuga"]),
    antagonists: tagAnti("scarola", ["cavolo", "finocchio"]),
    fertilizer: {
      demand: "medium",
      type: [
        "compost maturo in pre-trapianto",
        "leggera copertura azotata in crescita",
      ],
      schedule: "fondo + 1 copertura prima dell'imbianchimento",
      notes:
        "imbianchimento del cuore legando i cespi prima della raccolta",
    },
    treatments: {
      pests: ["afidi", "lumache", "nottua", "Sclerotinia"],
      remedies: [
        "fosfato ferrico",
        "sapone di Marsiglia",
        "Bacillus thuringiensis kurstaki",
        "irrigazione al mattino",
      ],
    },
  },
  {
    id: "songino",
    name: "Songino",
    scientific: "Valerianella locusta",
    emoji: "🌱",
    category: "foglia",
    perCell: 16,
    defaultSpacingCm: 8,
    sun: "partial",
    water: "medium",
    sowing: [8, 9, 10, 2, 3],
    harvest: [10, 11, 12, 1, 2, 3, 4],
    companions: tagComp("songino", ["fava", "carota", "ravanello", "porro"]),
    antagonists: tagAnti("songino", []),
    fertilizer: {
      demand: "low",
      type: ["compost maturo (poco) in pre-semina"],
      schedule:
        "ciclo breve: solo concimazione di fondo leggera, no copertura",
      notes: "ortaggio rustico autunno-invernale, poco esigente",
    },
    treatments: {
      pests: ["afidi", "oidio", "lumache", "peronospora"],
      remedies: [
        "sapone di Marsiglia",
        "zolfo contro oidio",
        "fosfato ferrico contro lumache",
        "evitare semine fitte (favoriscono malattie)",
      ],
    },
  },
  {
    id: "cicoria",
    name: "Cicoria",
    scientific: "Cichorium intybus",
    emoji: "🥬",
    category: "foglia",
    perCell: 4,
    defaultSpacingCm: 25,
    sun: "full",
    water: "medium",
    sowing: [4, 5, 6, 7, 8],
    harvest: [7, 8, 9, 10, 11, 12],
    companions: tagComp("cicoria", ["lattuga", "carota", "porro", "pomodoro", "fagiolo"]),
    antagonists: tagAnti("cicoria", []),
    fertilizer: {
      demand: "medium",
      type: ["compost maturo in pre-semina", "macerato di ortica leggero"],
      schedule: "fondo + 1 leggera copertura azotata",
      notes:
        "evitare eccessi di azoto (accentuano l'amaro e ritardano l'imbianchimento)",
    },
    treatments: {
      pests: ["lumache", "afidi", "nottua", "marciume del colletto"],
      remedies: [
        "fosfato ferrico",
        "sapone di Marsiglia / olio di neem",
        "Bacillus thuringiensis kurstaki",
        "rotazione di 3 anni",
      ],
    },
  },
  {
    id: "pomodoro-datterino-rosso",
    name: "Pomodoro datterino rosso",
    scientific: "Solanum lycopersicum var. cerasiforme",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 40,
    sun: "full",
    water: "high",
    sowing: [2, 3, 4],
    harvest: [6, 7, 8, 9, 10],
    companions: tagComp("pomodoro-datterino-rosso", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-datterino-rosso", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "pomodoro-datterino-giallo",
    name: "Pomodoro datterino giallo",
    scientific: "Solanum lycopersicum var. cerasiforme",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 40,
    sun: "full",
    water: "high",
    sowing: [2, 3, 4],
    harvest: [6, 7, 8, 9, 10],
    companions: tagComp("pomodoro-datterino-giallo", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-datterino-giallo", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "pomodoro-datterino-arancione",
    name: "Pomodoro datterino arancione",
    scientific: "Solanum lycopersicum var. cerasiforme",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 40,
    sun: "full",
    water: "high",
    sowing: [2, 3, 4],
    harvest: [6, 7, 8, 9, 10],
    companions: tagComp("pomodoro-datterino-arancione", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-datterino-arancione", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "pomodoro-datterino-nero",
    name: "Pomodoro datterino nero",
    scientific: "Solanum lycopersicum var. cerasiforme",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 40,
    sun: "full",
    water: "high",
    sowing: [2, 3, 4],
    harvest: [7, 8, 9, 10],
    companions: tagComp("pomodoro-datterino-nero", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-datterino-nero", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "pomodoro-ciliegino-rosso",
    name: "Pomodoro ciliegino rosso",
    scientific: "Solanum lycopersicum var. cerasiforme",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 40,
    sun: "full",
    water: "high",
    sowing: [2, 3, 4],
    harvest: [6, 7, 8, 9, 10],
    companions: tagComp("pomodoro-ciliegino-rosso", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-ciliegino-rosso", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "pomodoro-ciliegino-giallo",
    name: "Pomodoro ciliegino giallo",
    scientific: "Solanum lycopersicum var. cerasiforme",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 40,
    sun: "full",
    water: "high",
    sowing: [2, 3, 4],
    harvest: [6, 7, 8, 9, 10],
    companions: tagComp("pomodoro-ciliegino-giallo", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-ciliegino-giallo", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "pomodoro-san-marzano",
    name: "Pomodoro San Marzano",
    scientific: "Solanum lycopersicum 'San Marzano'",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 50,
    sun: "full",
    water: "high",
    sowing: [2, 3, 4],
    harvest: [7, 8, 9],
    companions: tagComp("pomodoro-san-marzano", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-san-marzano", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "pomodoro-cuore-di-bue",
    name: "Pomodoro cuore di bue",
    scientific: "Solanum lycopersicum 'Cuore di Bue'",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 60,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5],
    harvest: [7, 8, 9],
    companions: tagComp("pomodoro-cuore-di-bue", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-cuore-di-bue", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "pomodoro-costoluto",
    name: "Pomodoro costoluto fiorentino",
    scientific: "Solanum lycopersicum 'Costoluto Fiorentino'",
    emoji: "🍅",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 60,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5],
    harvest: [7, 8, 9, 10],
    companions: tagComp("pomodoro-costoluto", ["basilico", "carota", "prezzemolo", "cipolla", "aglio"]),
    antagonists: tagAnti("pomodoro-costoluto", ["cavolo", "fagiolo", "finocchio", "patata"]),
    fertilizer: TOMATO_FERTILIZER,
    treatments: TOMATO_TREATMENTS,
  },
  {
    id: "zucchina-chiara",
    name: "Zucchina chiara genovese",
    scientific: "Cucurbita pepo 'Chiaro Genovese'",
    emoji: "🥒",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 80,
    sun: "full",
    water: "high",
    sowing: [4, 5, 6],
    harvest: [6, 7, 8, 9],
    companions: tagComp("zucchina-chiara", ["fagiolo", "rucola", "mais"]),
    antagonists: tagAnti("zucchina-chiara", ["patata", "cetriolo"]),
    fertilizer: ZUCCHINI_FERTILIZER,
    treatments: ZUCCHINI_TREATMENTS,
  },
  {
    id: "zucchina-scura",
    name: "Zucchina scura",
    scientific: "Cucurbita pepo 'Black Beauty'",
    emoji: "🥒",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 80,
    sun: "full",
    water: "high",
    sowing: [4, 5, 6],
    harvest: [6, 7, 8, 9],
    companions: tagComp("zucchina-scura", ["fagiolo", "rucola", "mais"]),
    antagonists: tagAnti("zucchina-scura", ["patata", "cetriolo"]),
    fertilizer: ZUCCHINI_FERTILIZER,
    treatments: ZUCCHINI_TREATMENTS,
  },
  {
    id: "zucchina-tonda",
    name: "Zucchina tonda",
    scientific: "Cucurbita pepo 'Tonda di Nizza'",
    emoji: "🥒",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 80,
    sun: "full",
    water: "high",
    sowing: [4, 5, 6],
    harvest: [6, 7, 8, 9],
    companions: tagComp("zucchina-tonda", ["fagiolo", "rucola", "mais"]),
    antagonists: tagAnti("zucchina-tonda", ["patata", "cetriolo"]),
    fertilizer: ZUCCHINI_FERTILIZER,
    treatments: ZUCCHINI_TREATMENTS,
  },
  {
    id: "zucchina-trombetta",
    name: "Zucchina trombetta di Albenga",
    scientific: "Cucurbita moschata 'Trombetta d'Albenga'",
    emoji: "🥒",
    category: "frutto",
    perCell: 1,
    defaultSpacingCm: 100,
    sun: "full",
    water: "high",
    sowing: [3, 4, 5],
    harvest: [6, 7, 8, 9, 10],
    companions: tagComp("zucchina-trombetta", ["fagiolo", "rucola", "mais"]),
    antagonists: tagAnti("zucchina-trombetta", ["patata", "cetriolo"]),
    fertilizer: ZUCCHINI_FERTILIZER,
    treatments: ZUCCHINI_TREATMENTS,
  },
];

export const PLANTS_BY_ID = Object.fromEntries(PLANTS.map((p) => [p.id, p]));

export const MONTHS = [
  "Gen",
  "Feb",
  "Mar",
  "Apr",
  "Mag",
  "Giu",
  "Lug",
  "Ago",
  "Set",
  "Ott",
  "Nov",
  "Dic",
];

export const MONTHS_LONG = [
  "Gennaio",
  "Febbraio",
  "Marzo",
  "Aprile",
  "Maggio",
  "Giugno",
  "Luglio",
  "Agosto",
  "Settembre",
  "Ottobre",
  "Novembre",
  "Dicembre",
];

/** Compact Italian month ranges, e.g. [3,4,5] → "mar-mag". */
export function formatMonthRanges(months: number[]): string {
  if (months.length === 0) return "";
  const sorted = [...months].sort((a, b) => a - b);
  const parts: string[] = [];
  let start = sorted[0];
  let end = sorted[0];

  const flush = () => {
    const a = MONTHS[start - 1].toLowerCase();
    const b = MONTHS[end - 1].toLowerCase();
    parts.push(start === end ? a : `${a}-${b}`);
  };

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      flush();
      start = end = sorted[i];
    }
  }
  flush();
  return parts.join(", ");
}

export type PlantRotationMeta = {
  cropFamily: CropFamily;
  rotationGroup: RotationGroup;
  rotationBreakYears?: number;
  cropCycleDays?: { min: number; max: number };
};

/**
 * Metadati di rotazione “curati” per plantId (opzionali).
 * Nota: il catalogo è ampio; iniziamo con le specie più comuni e lasciamo
 * il resto a euristiche/dati futuri.
 */
const ROTATION_META_BY_ID: Partial<Record<string, PlantRotationMeta>> = {
  // Solanaceae
  pomodoro: { cropFamily: "solanaceae", rotationGroup: "fruiting", rotationBreakYears: 3, cropCycleDays: { min: 90, max: 160 } },
  peperone: { cropFamily: "solanaceae", rotationGroup: "fruiting", rotationBreakYears: 3, cropCycleDays: { min: 110, max: 170 } },
  melanzana: { cropFamily: "solanaceae", rotationGroup: "fruiting", rotationBreakYears: 3, cropCycleDays: { min: 120, max: 180 } },
  patata: { cropFamily: "solanaceae", rotationGroup: "root", rotationBreakYears: 3, cropCycleDays: { min: 90, max: 140 } },

  // Cucurbitaceae
  zucchina: { cropFamily: "cucurbitaceae", rotationGroup: "fruiting", rotationBreakYears: 3, cropCycleDays: { min: 60, max: 120 } },
  cetriolo: { cropFamily: "cucurbitaceae", rotationGroup: "fruiting", rotationBreakYears: 3, cropCycleDays: { min: 60, max: 120 } },
  zucca: { cropFamily: "cucurbitaceae", rotationGroup: "fruiting", rotationBreakYears: 3, cropCycleDays: { min: 90, max: 150 } },
  melone: { cropFamily: "cucurbitaceae", rotationGroup: "fruiting", rotationBreakYears: 3, cropCycleDays: { min: 75, max: 130 } },

  // Brassicaceae
  cavolo: { cropFamily: "brassicaceae", rotationGroup: "brassica", rotationBreakYears: 4, cropCycleDays: { min: 90, max: 180 } },
  broccoli: { cropFamily: "brassicaceae", rotationGroup: "brassica", rotationBreakYears: 4, cropCycleDays: { min: 80, max: 160 } },
  cavolfiore: { cropFamily: "brassicaceae", rotationGroup: "brassica", rotationBreakYears: 4, cropCycleDays: { min: 80, max: 170 } },
  rucola: { cropFamily: "brassicaceae", rotationGroup: "leafy", rotationBreakYears: 2, cropCycleDays: { min: 30, max: 60 } },

  // Fabaceae
  fagiolo: { cropFamily: "fabaceae", rotationGroup: "legume", rotationBreakYears: 2, cropCycleDays: { min: 50, max: 90 } },
  pisello: { cropFamily: "fabaceae", rotationGroup: "legume", rotationBreakYears: 2, cropCycleDays: { min: 70, max: 110 } },
  fava: { cropFamily: "fabaceae", rotationGroup: "legume", rotationBreakYears: 2, cropCycleDays: { min: 90, max: 150 } },

  // Apiaceae
  carota: { cropFamily: "apiaceae", rotationGroup: "root", rotationBreakYears: 3, cropCycleDays: { min: 70, max: 130 } },
  sedano: { cropFamily: "apiaceae", rotationGroup: "leafy", rotationBreakYears: 3, cropCycleDays: { min: 120, max: 200 } },
  prezzemolo: { cropFamily: "apiaceae", rotationGroup: "aromatic", rotationBreakYears: 2, cropCycleDays: { min: 60, max: 180 } },
  finocchio: { cropFamily: "apiaceae", rotationGroup: "root", rotationBreakYears: 3, cropCycleDays: { min: 90, max: 140 } },

  // Alliaceae (Amaryllidaceae s.l. in botanica moderna)
  cipolla: { cropFamily: "alliaceae", rotationGroup: "allium", rotationBreakYears: 3, cropCycleDays: { min: 120, max: 240 } },
  aglio: { cropFamily: "alliaceae", rotationGroup: "allium", rotationBreakYears: 3, cropCycleDays: { min: 160, max: 260 } },
  porro: { cropFamily: "alliaceae", rotationGroup: "allium", rotationBreakYears: 3, cropCycleDays: { min: 140, max: 240 } },

  // Asteraceae
  lattuga: { cropFamily: "asteraceae", rotationGroup: "leafy", rotationBreakYears: 2, cropCycleDays: { min: 35, max: 90 } },
  cicoria: { cropFamily: "asteraceae", rotationGroup: "leafy", rotationBreakYears: 2, cropCycleDays: { min: 60, max: 140 } },

  // Chenopodiaceae / Amaranthaceae
  bietola: { cropFamily: "chenopodiaceae", rotationGroup: "leafy", rotationBreakYears: 3, cropCycleDays: { min: 60, max: 160 } },
  spinacio: { cropFamily: "chenopodiaceae", rotationGroup: "leafy", rotationBreakYears: 3, cropCycleDays: { min: 35, max: 70 } },

  // Lamiaceae
  basilico: { cropFamily: "lamiaceae", rotationGroup: "aromatic", rotationBreakYears: 1, cropCycleDays: { min: 50, max: 120 } },
  salvia: { cropFamily: "lamiaceae", rotationGroup: "perennial", rotationBreakYears: 1 },
  rosmarino: { cropFamily: "lamiaceae", rotationGroup: "perennial", rotationBreakYears: 1 },
  menta: { cropFamily: "lamiaceae", rotationGroup: "perennial", rotationBreakYears: 1 },
  timo: { cropFamily: "lamiaceae", rotationGroup: "perennial", rotationBreakYears: 1, cropCycleDays: { min: 365, max: 3650 } },
  maggiorana: { cropFamily: "lamiaceae", rotationGroup: "aromatic", rotationBreakYears: 1, cropCycleDays: { min: 90, max: 150 } },
  origano: { cropFamily: "lamiaceae", rotationGroup: "perennial", rotationBreakYears: 1, cropCycleDays: { min: 365, max: 3650 } },
  melissa: { cropFamily: "lamiaceae", rotationGroup: "perennial", rotationBreakYears: 1 },
  lavanda: { cropFamily: "lamiaceae", rotationGroup: "perennial", rotationBreakYears: 1 },

  // Apiaceae (aromatiche foglia)
  finocchietto: { cropFamily: "apiaceae", rotationGroup: "aromatic", rotationBreakYears: 3, cropCycleDays: { min: 120, max: 365 } },
  coriandolo: { cropFamily: "apiaceae", rotationGroup: "aromatic", rotationBreakYears: 2, cropCycleDays: { min: 40, max: 90 } },
  aneto: { cropFamily: "apiaceae", rotationGroup: "aromatic", rotationBreakYears: 2, cropCycleDays: { min: 60, max: 100 } },

  // Asteraceae (aromatica)
  dragoncello: { cropFamily: "asteraceae", rotationGroup: "perennial", rotationBreakYears: 2, cropCycleDays: { min: 120, max: 365 } },

  // Alliaceae
  "erba-cipollina": { cropFamily: "alliaceae", rotationGroup: "allium", rotationBreakYears: 3, cropCycleDays: { min: 365, max: 3650 } },
};

export function plantRotationMeta(plantId: string): PlantRotationMeta | null {
  return ROTATION_META_BY_ID[plantId] ?? null;
}

export function plantById(id: string) {
  const p = PLANTS_BY_ID[id];
  if (!p) return p;
  const meta = plantRotationMeta(id);
  return meta ? { ...p, ...meta } : p;
}
