export type SunNeed = "full" | "partial" | "shade";

export type PlantCategory =
  | "ortaggio"
  | "aromatica"
  | "frutto"
  | "frutti-di-bosco"
  | "leguminosa"
  | "radice"
  | "foglia";

/**
 * Famiglia botanica (approssimata) per rotazioni colturali.
 * Campo opzionale: se assente, la rotazione può degradare su euristiche.
 */
export type CropFamily =
  | "solanaceae"
  | "cucurbitaceae"
  | "brassicaceae"
  | "fabaceae"
  | "apiaceae"
  | "alliaceae"
  | "asteraceae"
  | "chenopodiaceae"
  | "lamiaceae"
  | "poaceae"
  | "other";

/**
 * Gruppo di rotazione semplificato (utile quando la famiglia è ignota).
 */
export type RotationGroup =
  | "fruiting"
  | "leafy"
  | "root"
  | "legume"
  | "allium"
  | "brassica"
  | "aromatic"
  | "perennial"
  | "other";

/**
 * Esigenza nutritiva complessiva della pianta:
 * - `low`: poco esigente (es. Allium, aromatiche)
 * - `medium`: mediamente esigente (es. foglia, radice)
 * - `high`: molto esigente / "ingordo" (es. solanacee, cucurbitacee, cavoli)
 * - `fixer`: azotofissatrice, migliora il terreno (leguminose)
 */
export type FertilizerDemand = "low" | "medium" | "high" | "fixer";

/**
 * Linee guida di concimazione consigliate per la pianta.
 * Pensate per orto biologico domestico.
 */
export type PlantFertilizer = {
  demand: FertilizerDemand;
  /** Tipi di concime principali consigliati (1-3 voci) */
  type: string[];
  /** Periodicità/frequenza di concimazione (testo libero, breve) */
  schedule: string;
  /** Note opzionali (e.g., "evitare letame fresco") */
  notes?: string;
};

/**
 * Avversità tipiche e relativi rimedi consigliati (preferenza biologica).
 */
export type PlantTreatment = {
  /** Parassiti e malattie comuni */
  pests: string[];
  /** Rimedi/trattamenti biologici suggeriti */
  remedies: string[];
};

/**
 * Convenzione per interpretare `spacingCm`:
 * - `center-to-center`: distanza centro-centro fra piante adiacenti (default).
 * - `edge-to-edge`: spazio vuoto fra piante adiacenti, assumendo che il
 *   diametro della pianta sia pari alla spaziatura stessa.
 * - `footprint`: lato del riquadro quadrato riservato a ciascuna pianta.
 */
export type SpacingMode = "center-to-center" | "edge-to-edge" | "footprint";

/**
 * Disposizione delle piante nel patch:
 * - `square`: griglia regolare `cols x rows`.
 * - `triangular`: file alternativamente sfalsate di mezzo passo, con
 *   passo verticale ridotto (packing esagonale; ~15% piu compatto).
 */
export type PatchArrangement = "square" | "triangular";

/** Voce di consociazione o antagonismo nel catalogo (nome + motivo leggibile). */
export type PlantNeighborEntry = {
  /** ID pianta nel catalogo (per matching con i patch vicini). */
  plantId: string;
  /** Nome comune mostrato in UI. */
  name: string;
  /** Perché la relazione è consigliata o da evitare (orientativo, orto domestico). */
  reason: string;
};

export type Plant = {
  id: string;
  name: string;
  scientific?: string;
  emoji: string;
  category: PlantCategory;
  /** Famiglia botanica (rotazione). */
  cropFamily?: CropFamily;
  /** Gruppo di rotazione semplificato. */
  rotationGroup?: RotationGroup;
  /** Pausa consigliata (anni) prima di ripetere famiglia/gruppo sulla stessa aiuola. */
  rotationBreakYears?: number;
  /**
   * Durata tipica del ciclo colturale (giorni). Opzionale: se mancante si
   * ragiona con mesi semina/raccolto e diario eventi.
   */
  cropCycleDays?: { min: number; max: number };
  /**
   * Piante per quadrato 30×30 cm (rifer. catalogo / square foot semplificato);
   * nella UI "N/cella" è scalato in base a `Bed.cellSizeCm` (stessa densità, area).
   */
  perCell: 1 | 2 | 4 | 9 | 16;
  /** Distanza consigliata fra piante della stessa specie (cm) */
  defaultSpacingCm: number;
  /** Convenzione di default per `defaultSpacingCm` (default `center-to-center`) */
  defaultSpacingMode?: SpacingMode;
  /** Disposizione di default (default `square`) */
  defaultArrangement?: PatchArrangement;
  sun: SunNeed;
  water: "low" | "medium" | "high";
  /** Mesi di semina (1-12) */
  sowing: number[];
  /**
   * Mesi di trapianto (1-12), quando è comune inserire in aiuola una piantina
   * già avviata (alveolo/vasetto) invece della semina diretta.
   * Opzionale: se assente, la specie viene considerata solo per semina/raccolto.
   */
  transplanting?: number[];
  /** Mesi di raccolto (1-12) */
  harvest: number[];
  /** Piante consigliate accanto, con motivo sintetico. */
  companions: PlantNeighborEntry[];
  /** Piante da tenere distanti, con motivo sintetico. */
  antagonists: PlantNeighborEntry[];
  /** Indicazioni di concimazione (opzionale) */
  fertilizer?: PlantFertilizer;
  /** Avversità comuni e rimedi consigliati (opzionale) */
  treatments?: PlantTreatment;
};

/**
 * Blocco di piante della stessa specie disposte su una sotto-griglia
 * `plantCols x plantRows` con spaziatura `spacingCm`. La convenzione e'
 * data da `spacingMode` (default `center-to-center`); `arrangement`
 * controlla la disposizione (default `square`).
 *
 * L'`anchor` indica la cella in alto a sinistra occupata nella griglia
 * dell'aiuola (le celle sono `Bed.cellSizeCm` cm di lato, default 30).
 */
export type PlantPatch = {
  id: string;
  plantId: string;
  anchor: { col: number; row: number };
  /** Numero di piante in larghezza (>= 1) */
  plantCols: number;
  /** Numero di piante in altezza (>= 1) */
  plantRows: number;
  /** Override della spaziatura di specie (cm) */
  spacingCm?: number;
  /** Override della convenzione di spaziatura */
  spacingMode?: SpacingMode;
  /** Override della disposizione */
  arrangement?: PatchArrangement;
};

export type Bed = {
  id: string;
  name: string;
  position: { x: number; y: number };
  cols: number;
  rows: number;
  /** Lato fisico di una cella in cm (default 30) */
  cellSizeCm?: number;
  patches: PlantPatch[];
};

export type SunOrientation = "N" | "S" | "E" | "O";

/**
 * Posizione geografica dell'orto (opzionale). Usata dal motore di
 * suggerimenti per recuperare il meteo locale tramite Open-Meteo.
 */
export type GardenLocation = {
  lat: number;
  lon: number;
  /** Etichetta leggibile, es. "Bologna, IT" */
  label?: string;
  /** Timezone IANA, es. "Europe/Rome" */
  timezone?: string;
};

export type GardenMeta = {
  name: string;
  sunOrientation: SunOrientation;
  createdAt: number;
  /** Posizione geografica (opzionale, abilita le funzioni meteo) */
  location?: GardenLocation;
};

export type Selection =
  | { kind: "bed"; bedId: string }
  | { kind: "plant"; bedId: string; patchId: string }
  | null;

export type CompanionConflict = {
  bedId: string;
  patchId: string;
  neighborPatchId: string;
  type: "good" | "bad";
};

/**
 * Tipo di voce nel diario attività (label UI in italiano a parte).
 */
export type GardenActivityKind =
  | "sowing"
  | "weeding"
  | "watering"
  | "transplanting"
  | "treatment"
  | "harvest"
  | "note"
  | "other";

/**
 * Evento di giardinaggio: data, tipo e riferimenti opzionali.
 * `plantId` denormalizzato se legato a un patch, per mostrare il nome
 * anche se il patch viene rimosso in seguito.
 */
export type GardenActivity = {
  id: string;
  /** Timestamp (ms) dell'attività */
  at: number;
  kind: GardenActivityKind;
  notes?: string;
  bedId?: string;
  patchId?: string;
  plantId?: string;
  /**
   * Vero se l'attività è stata creata da un suggerimento accettato e si
   * trova nel futuro. Usato dal Diario per renderizzarla come "pianificata"
   * con un'azione "Segna come fatta".
   */
  planned?: boolean;
};

/**
 * Suggerimento generato dall'LLM. Vive in memoria nel pannello
 * Suggerimenti finché l'utente non lo accetta (diventa `GardenActivity`)
 * o lo ignora (id memorizzato in `dismissedSuggestionIds`).
 */
export type SuggestionConfidence = "low" | "medium" | "high";

/**
 * Una riga per pianta/patch dentro un suggerimento raggruppato per
 * `kind`: indica se serve l'attività e il perché (cadenze, eventi, meteo).
 */
export type SuggestionPlantItem = {
  bedId?: string;
  patchId?: string;
  plantId?: string;
  /** Nome da mostrare (catalogo o testo modello) */
  plantName?: string;
  /** Vero se questo patch necessita l'attività nel periodo proposto */
  needsAction: boolean;
  /** Motivazione specifica: ultima attività, età pianta, cadenza, meteo */
  rationale: string;
};

export type Suggestion = {
  id: string;
  createdAt: number;
  kind: GardenActivityKind;
  /** Timestamp consigliato per l'azione (stesso per tutte le piante del gruppo) */
  suggestedFor: number;
  /** Tolleranza in giorni intorno a `suggestedFor` (es. 3 = +/- 3 giorni) */
  windowDays?: number;
  /**
   * Legacy: un solo target (se `items` e' assente, il suggerimento riguarda
   * un singolo patch).
   */
  bedId?: string;
  patchId?: string;
  plantId?: string;
  /** Titolo breve mostrato nella card */
  title: string;
  /** Sintesi complessiva in italiano (incluso collegamento al meteo) */
  rationale: string;
  /** Eventuale nota meteo che ha guidato la decisione */
  weatherNote?: string;
  confidence: SuggestionConfidence;
  /**
   * Valutazione per ciascun patch rilevante per questo tipo di attivita'.
   * Se presente, il suggerimento e' "per categoria" con elenco piante.
   */
  items?: SuggestionPlantItem[];
};
