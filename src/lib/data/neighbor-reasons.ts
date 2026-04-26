import type { PlantNeighborEntry } from "@/lib/types";

/**
 * Display names for companion entries (includes species mentioned only as
 * companions/antagonists and not available as placeable plants).
 */
export const NEIGHBOR_LABELS: Record<string, string> = {
  aglio: "Aglio",
  aneto: "Aneto",
  asparago: "Asparago",
  basilico: "Basilico",
  bietola: "Bietola",
  "bietola-taglio": "Bietola da taglio",
  carota: "Carota",
  cavolo: "Cavolo",
  "cavolo-cappuccio": "Cavolo cappuccio",
  "cavolo-cappuccio-viola": "Cavolo cappuccio viola",
  "cavolo-nero": "Cavolo nero",
  "cavolo-verza": "Cavolo verza",
  cetriolo: "Cetriolo",
  cicoria: "Cicoria",
  cipolla: "Cipolla",
  coriandolo: "Coriandolo",
  dragoncello: "Dragoncello (estragon)",
  "erba-cipollina": "Erba cipollina",
  fagiolo: "Fagiolo",
  fava: "Fava",
  finocchietto: "Finocchietto",
  finocchio: "Finocchio",
  fragola: "Fragola",
  "fragola-di-bosco": "Fragola di bosco",
  indivia: "Indivia riccia",
  lattuga: "Lattuga",
  "lattuga-canasta": "Lattuga canasta",
  "lattuga-iceberg": "Lattuga iceberg",
  "lattuga-lollo": "Lattuga lollo (verde/rossa)",
  "lattuga-romana": "Lattuga romana",
  lavanda: "Lavanda",
  maggiorana: "Maggiorana",
  mais: "Mais",
  melanzana: "Melanzana",
  melissa: "Melissa",
  menta: "Menta",
  mirtillo: "Mirtillo",
  "mirtillo-rosso": "Mirtillo rosso",
  origano: "Origano",
  "peperoncino-corno-rosso": "Peperoncino corno rosso",
  "peperoncino-habanero": "Peperoncino habanero",
  peperone: "Peperone",
  "peperone-friggitelli": "Peperoni friggitelli",
  pisello: "Pisello",
  pomodoro: "Pomodoro",
  "pomodoro-ciliegino-giallo": "Pomodoro ciliegino giallo",
  "pomodoro-ciliegino-rosso": "Pomodoro ciliegino rosso",
  "pomodoro-costoluto": "Pomodoro costoluto fiorentino",
  "pomodoro-cuore-di-bue": "Pomodoro cuore di bue",
  "pomodoro-datterino-arancione": "Pomodoro datterino arancione",
  "pomodoro-datterino-giallo": "Pomodoro datterino giallo",
  "pomodoro-datterino-nero": "Pomodoro datterino nero",
  "pomodoro-datterino-rosso": "Pomodoro datterino rosso",
  "pomodoro-san-marzano": "Pomodoro San Marzano",
  porro: "Porro",
  prezzemolo: "Prezzemolo",
  radicchio: "Radicchio",
  rapa: "Rapa",
  ravanello: "Ravanello",
  "ribes-nero": "Ribes nero",
  "ribes-rosso": "Ribes rosso",
  rosa: "Rosa",
  rosmarino: "Rosmarino",
  rucola: "Rucola",
  ruta: "Ruta",
  salvia: "Salvia",
  scalogno: "Scalogno",
  scarola: "Scarola",
  sedano: "Sedano",
  songino: "Songino",
  spinacio: "Spinacio",
  timo: "Timo",
  "uva-spina": "Uva spina",
  zucchina: "Zucchina",
  "zucchina-chiara": "Zucchina chiara genovese",
  "zucchina-scura": "Zucchina scura",
  "zucchina-tonda": "Zucchina tonda",
  "zucchina-trombetta": "Zucchina trombetta di Albenga",
} as const;

const DEFAULT_COMPANION_REASON =
  "Consociazione tradizionale: complementa ciclo colturale, profilo radicale o microclima senza le interferenze tipiche delle coppie da evitare.";

const DEFAULT_ANTAGONIST_REASON =
  "Competizione per luce, acqua o nutrienti, oppure rischio di parassiti/malattie comuni se restano troppo vicine.";

/** Raggruppa varietà per motivazioni comuni (pomodoro-*, zucchina-*, …). */
function hostFamilyKey(host: string): string {
  if (host.startsWith("pomodoro")) return "pomodoro";
  if (host.startsWith("zucchina")) return "zucchina";
  if (host.startsWith("cavolo")) return "cavolo";
  if (host.startsWith("lattuga")) return "lattuga";
  if (host.startsWith("peperone") || host.startsWith("peperoncino")) return "peperone";
  if (host.startsWith("fragola")) return "fragola";
  if (host === "finocchietto") return "finocchio";
  return host;
}

/**
 * Motivo quando `neighbor` è elencata tra le compagne di `host`
 * (letteratura orticola / extension: molte coppie hanno evidenza mista;
 * testi orientativi per l’orto domestico).
 */
const TARGET_COMPANION: Partial<Record<string, string>> = {
  aglio: "Odori solforati associati in orto a minore pressione di insetti fogliari; spesso abbinato a carota e pomodoro.",
  asparago: "Coltura perenne ordinata che non invade il bulbo e lascia filari drenanti utili all’aglio.",
  basilico: "Aromi che possono confondere afidi e alcune tignole verso le solanacee; abbinamento mediterraneo classico.",
  bietola: "Foglia rapida che sfrutta nitrogeno lasciato da colture precedenti senza competere in profondità con allium.",
  carota: "Radici profonde che aerano il terreno; con cipolla/porro si riduce la mosca della carota nelle guide orticole.",
  cavolo: "Brassicacea che beneficia di aromi (maggiorana, salvia) e di file d’allium per confondere cavolaia e altiche.",
  cetriolo: "Cucurbitacea che crea microclima umido utile a lattughe e piselli se resta spazio tra le chiome.",
  cicoria: "Ciclo fogliare compatibile con file di allium che mascherano insetti e sfruttano strati radiciali diversi.",
  cipolla: "Allium che emette odori utili contro insetti delle radici (carota) e delle brassicacee in consociazioni note.",
  fagiolo: "Leguminosa azotofissatrice: apporta azoto se non ombreggia eccessivamente colture basse nello stesso quadro.",
  fava: "Miglioratrice del suolo; vicino a lattughe e ravanello ripartisce le date di raccolta.",
  finocchio: "Apiacea da bulbo che convive con lattughe e piselli quando il passo tra file evita ristagni.",
  finocchietto: "Aromatica fogliare che non compete con il bulbo e richiama insetti utili se lasciata a bordo aiuola.",
  fragola: "Copertura del suolo e ciclo perenne compatibile con ravanello e leguminose a ciclo breve.",
  lattuga: "Insalata a ciclo rapido e radici superficiali: riempie spazi senza togliere risorse profonde alle altre specie.",
  lavanda: "Perenne xerofita che non compete per acqua con salvia e timo in bordure soleggiate.",
  maggiorana: "Lamiacea dolce che in tradizione accompagna solanacee e cucurbitacee senza invadere.",
  mais: "Supporto verticale per fagioli rampicanti (tre sorelle semplificate); radici diverse dalle cucurbitacee.",
  melanzana: "Solanacea da frutto che beneficia di basilico e leguminose per azoto e aromi complementari.",
  menta: "Vigorosa: meglio in margini o vasi; vicino a cavoli in elenco tradizionale serve come distrazione per altiche.",
  origano: "Copertura aromatica bassa che in letteratura accompagna solanacee e zucchine contro insetti masticatori.",
  patata: "Tubero che sfrutta strati profond diversi dalle radici fibrose del fava se il passo è sufficiente.",
  peperone: "Solanacea che condivide basilico e carota per la gestione integrata degli afidi in molte tabelle orticole.",
  pisello: "Rampicante o eretto che fissa azoto utile a cetrioli e lattughe in consociazioni leggere.",
  pomodoro: "Solanacea da allestimento verticale: aromi a foglia (basilico, origano) sono associati a minore danno da tignole/afidi in alcuni studi.",
  porro: "Allium lungo ciclo che convive con carota e cavolo per effetto repellente su mosche radicanti e lepidotteri.",
  prezzemolo: "Apiacea bassa utile tra pomodori e cipolle per ombreggiare il suolo e richiamare insetti utili.",
  radicchio: "Cicoria da foglia che beneficia di leguminose per azoto e di finocchio per cicli scaglionati.",
  rapa: "Brassica rapida che alleggerisce la pressione insetti sul pisello in rotazioni compatte.",
  ravanello: "Ciclo brevissimo che prepara il posto a fragola o lattuga e marca la fila per la semina successiva.",
  rosa: "Arbusto ornamentale in bordo che non concorre con il bulbo dell’aglio e favorisce paesaggio utile agli insetti utili.",
  rosmarino: "Perenne mediterranea che non compete per acqua con carota e rucola in bordure calde.",
  rucola: "Brassica fogliare rapida che convive con fagiolo e mais in occupazione temporale diversa.",
  salvia: "Lamiacea aromatica associata in guide a minor danno da lepidotteri sulle brassicacee e vicino ai porri.",
  sedano: "Apiacea da coste che tradizionalmente si affianca a cavoli, porri e spinaci con passo adeguato.",
  songino: "Valerianacea a foglia fine che sfrutta spazio tra fava e ravanello senza ombreggiare.",
  spinacio: "Foglia invernale rapida compatibile con sedano e pisello per stratificazione delle raccolte.",
  timo: "Aromatico basso segnalato in letteratura per ridurre deposizione di uova di alcuni lepidotteri sulle solanacee.",
  zucchina: "Cucurbitacea vigorosa che con mais e leguminose replica schemi di consociazione americana semplificati.",
};

const PAIR_COMPANION: Record<string, string> = {
  "carota:cipolla":
    "Coppia spesso citata per la mosca della carota: odori dell’allium riducono danni rispetto alla monocoltura (guide orticole e prove in campo).",
};

const TARGET_ANTAGONIST: Partial<Record<string, string>> = {
  aglio: "Può inibire nodosazione delle leguminose e creare microclima troppo umido se le chiome del vicino sono fitte.",
  aneto: "Stessa famiglia ombrellifera della carota: concentra le mosche minestrali e compete in fase giovanile.",
  carota: "Apiacea che con sedano o prezzemolo fitto aumenta pressione di mosche radicanti e competizione idrica.",
  cavolo: "Brassicacea pesante: stessi fitofagi (cavolaia, altiche) e forte richiesta di azoto accanto ad altre colture dense.",
  cetriolo: "Cucurbitacea molto espansa: con altre cucurbitacee o patata crea canopia umida favorevole a oidio e peronospora.",
  cipolla: "Allium che interferisce con la nodosazione di fagioli/piselli e può accentuare stress idrico vicino alle leguminose.",
  fagiolo: "Leguminosa che in fitto ombreggia e, in abbinamenti tradizionali sconsigliati, aumenta afidi/ruggine sul vicino.",
  fava: "Leguminosa alta che compete per luce con allium e finocchio; inoltre allelopatia leggera verso alcuni Allium.",
  finocchio: "Apiacea allelopatica e attrattiva per mosche ombrellifere: interferisce con pomodoro, fagiolo e cavolo.",
  fragola: "Basette fitte e peronospora: vicino al cavolo si crea umidità relativa elevata sgradita alle foglie tenere.",
  lattuga: "Foglia tenue che compete in ombra e umidità con prezzemolo fito e apiaceae radicanti.",
  mais: "Graminacea alta che sottrae luce e nutrienti in verticale: poco adatta accanto a sedano o apiaceae basse.",
  patata: "Forte fabbisogno idrico e nutrizionale; patogeni fogliari in comune con pomodoro e competizione con cucurbitacee.",
  pisello: "Leguminosa che con allium subisce nodosazione ridotta e, in elenchi tradizionali, conflitto di luce con porro.",
  pomodoro: "Solanacea da frutto: vicino ad altre solanacee o a colture delicate intensifica afidi e gestione fitosanitaria unica.",
  porro: "Allium lungo ciclo che compete per azoto con bietola da taglio e spinacio in fitto.",
  prezzemolo: "Apiacea che con lattuga o carota/sedano concentrano le stesse mosche minestrali.",
  zucchina: "Cucurbitacea vigorosa: con radicchio o cetriolo limita aerazione e favorisce mal fogliari in canopia densa.",
  ruta: "Composti fototossici e odori forti che in tradizione si evitano vicino al basilico.",
  scalogno: "Allium che con fava e leguminose interferisce su luce e nodosazione.",
  spinacio: "Stessa nicchia di bietola da taglio (foglia rapida e azoto): competizione diretta.",
};

const PAIR_ANTAGONIST: Record<string, string> = {
  "pomodoro:patata":
    "Entrambe solanacee: competono per potassio e acqua; patogeni fogliari (alternaria, peronospora) si favoriscono in fitto.",
  "pomodoro:cavolo":
    "Cicli e chiome molto diversi: il cavolo mantiene umidità e ospita fitofagi che si spostano facilmente verso il pomodoro.",
  "pomodoro:fagiolo":
    "Tradizione orticola: vigoria e strato fogliare diverso; in vicinanza stretta si segnalano più afidi e ruggine comune.",
  "pomodoro:finocchio":
    "Finocchio (Apiaceae) rilascia composti allelopatici e richiama mosche ombrellifere scomode vicino alle solanacee.",
  "lattuga:prezzemolo":
    "Due colture a foglia con esigenze simili e apiaceae dense: si concentrano mosche minestrali e si ostacolano.",
  "sedano:carota":
    "Stessa famiglia (Apiaceae): in fitto aumentano danni da mosca della carota/mosca del sedano e competizione radicale.",
  "sedano:prezzemolo":
    "Apiaceae affini: competono per strato radicale superficiale e per gli stessi fitofagi.",
  "sedano:mais":
    "Il mais sottrae luce e nutrienti in altezza lasciando il sedano in ombra e stress idrico.",
  "cetriolo:zucchina":
    "Due cucurbitacee vigorose vicine competono e mantengono fogliame denso: più oidio/peronospora e pollini incrociati indesiderati.",
  "zucchina:cetriolo": "Zucchina e cetriolo sono entrambe cucurbitacee e nella stessa aiuola stretta aumenta malattie fogliari comuni.",
  "zucchina:patata":
    "Patata e zucchina sono entrambe ingorde d’acqua e nutrienti; la chioma della zucchina ostacola aerazione intorno ai tuberi.",
  "melanzana:pomodoro":
    "Due solanacee affiancate concentrano gli stessi fitofagi (afidi, tripidi, lepidotteri) e richiedono stessa chimica di protezione.",
  "salvia:cetriolo":
    "Lamiacea molto aromatica in fitto può alterare microclima e attrarre tripidi che danneggiano anche le cucurbitacee.",
  "aglio:cavolo":
    "Il cavolo mantiene umidità tra le foglie mentre l’aglio preferisce suolo più asciutto e sole pieno sul bulbo.",
  "aglio:fagiolo":
    "Il fagiolo ombreggia e mantiene umidità relativa elevata, sfavorevole alla maturazione sana dell’aglio.",
  "aglio:pisello": "Come per fagiolo: leguminosa che riduce luce e asciugatura fogliare necessarie all’aglio.",
  "cipolla:fagiolo": "Allium che inibisce noduli radicali del fagiolo e ne riduce la fissazione dell’azoto.",
  "cipolla:pisello": "Stesso effetto allelopatico/allium verso la nodosazione del pisello.",
  "pisello:aglio": "Viceversa: allium vicino ai noduli del pisello ne deprime l’attività simbiotica.",
  "pisello:cipolla": "L’odore persistente delle cipolle interferisce con l’insediamento dei batteri nodulanti.",
  "porro:bietola": "Entrambe fogliose esigenti di azoto in continuo: competono per nutrienti e raccolta.",
  "porro:fagiolo": "Il fagiolo rampicante su porri ombreggia il fusto biancando e aumenta umidità fogliare.",
  "porro:pisello": "Come fagiolo: leguminosa che copre i porri e altera la qualità del fusto.",
  "finocchio:pomodoro": "Apiacea allelopatica e mosche specifiche: tradizione orticola sconsiglia il fitto con pomodoro.",
  "finocchio:fagiolo": "Finocchio esige irrigazioni che gonfiano i fagioli e richiama fitofagi comuni alle leguminose.",
  "finocchio:cavolo": "Entrambe attraggono lepidotteri delle brassicacee/ombrellifere in prossimità stretta.",
  "finocchio:aneto": "Due apiaceae dense competono e concentrano le mosche ombrellifere.",
  "aneto:carota": "Apiaceae gemelle: competizione radicale e doppia pressione di mosca della carota.",
  "aneto:finocchio": "Stessa famiglia: fitto sconsigliato per allelopatia leggera e fitofagi condivisi.",
  "carota:aneto": "Aneto e carota condividono parassiti delle ombrellifere: meglio distanziare o ruotare.",
  "prezzemolo:lattuga": "Prezzemolo fitto compete e concentra mosche minestrali verso la lattuga tenera.",
  "cavolo:pomodoro": "Brassica e solanacea entrambe esigenti: fitofagi e gestione fitosanitaria si complicano in adiacenza.",
  "cavolo:aglio": "In alcune combinazioni fitte il cavolo mantiene troppa umidità sulle foglie dell’allium.",
  "cavolo:fragola": "Fragola basa fogliare umida vicino al cavolo favorisce muffe grigie e competizione per luce radente.",
  "fragola:cavolo": "Il cavolo espande chiome che ombreggia e aumenta umidità relativa sulla fragola.",
  "fava:aglio":
    "Leguminosa e allium: l’aglio può ridurre nodosazione e, in fitto, le fava subiscono ombreggiamento sul apice.",
  "fava:cipolla": "Come aglio: interferenza con noduli e diverso fabbisogno idrico.",
  "fava:porro": "Allium lungo che compete per azoto e spazio radiale con la fava.",
  "fava:scalogno": "Allium che in fitto riduce luce e simbiosi radicale della fava.",
  "fava:fagiolo": "Due leguminose dense competono per luce e favoriscono afidi comuni.",
  "fava:pisello": "Come fagiolo: sovrapposizione di nicchia ecologica e fitofagi.",
  "fava:finocchio": "Finocchio allelopatico interferisce con la parte erbacea della fava.",
  "scalogno:fava": "Allium che limita luce e nodosazione della fava.",
  "scalogno:cavolo": "Chiome dense reciproche ostacolano aerazione e favoriscono funghi fogliari.",
  "scalogno:fagiolo": "Rampicante che copre gli allium bassi e altera maturazione.",
  "scalogno:pisello": "Come fagiolo: ombreggiamento eccessivo sul bulbo.",
  "bietola-taglio:porro": "Due colture a foglia molto esigenti di azoto in successione stretta: competizione diretta.",
  "bietola-taglio:spinacio": "Stessa nicchia di foglia tenera e raccolte frequenti: competono per nutrienti.",
  "indivia:cavolo": "Brassicacea e cicoria affiancate richiamano gli stessi lepidotteri e competono per azoto.",
  "indivia:finocchio": "Apiacea e cicoria in fitto competono per acqua e spazio radiale.",
  "scarola:cavolo": "Come indivia: pressione di fitofagi comuni e competizione fogliare.",
  "scarola:finocchio": "Finocchio e scarola hanno esigenze idriche discordanti in fitto.",
  "erba-cipollina:fagiolo": "Allium erbaceo che inibisce noduli e ombreggia il fagiolo basso.",
  "erba-cipollina:pisello": "Stesso schema: allium vs leguminosa in adiacenza stretta.",
  "finocchietto:finocchio":
    "Bulbo e finocchietto da foglia in fitto competono per acqua e rilasciano allelopatia reciproca.",
  "radicchio:zucchina": "Zucchina ombreggia e sottrae acqua al radicchio da cespo che preferisce luce diffusa ma costante.",
};

function companionReason(host: string, neighbor: string): string {
  const exact = `${host}:${neighbor}`;
  const family = `${hostFamilyKey(host)}:${neighbor}`;
  return (
    PAIR_COMPANION[exact] ??
    PAIR_COMPANION[family] ??
    TARGET_COMPANION[neighbor] ??
    DEFAULT_COMPANION_REASON
  );
}

function antagonistReason(host: string, neighbor: string): string {
  const exact = `${host}:${neighbor}`;
  const family = `${hostFamilyKey(host)}:${neighbor}`;
  return (
    PAIR_ANTAGONIST[exact] ??
    PAIR_ANTAGONIST[family] ??
    TARGET_ANTAGONIST[neighbor] ??
    DEFAULT_ANTAGONIST_REASON
  );
}

export function neighborLabel(plantId: string): string {
  return NEIGHBOR_LABELS[plantId] ?? plantId;
}

/** Costruisce l’array `companions` con nome e motivo per ogni voce. */
export function tagComp(hostPlantId: string, neighborIds: string[]): PlantNeighborEntry[] {
  return neighborIds.map((plantId) => ({
    plantId,
    name: neighborLabel(plantId),
    reason: companionReason(hostPlantId, plantId),
  }));
}

/** Costruisce l’array `antagonists` con nome e motivo per ogni voce. */
export function tagAnti(hostPlantId: string, neighborIds: string[]): PlantNeighborEntry[] {
  return neighborIds.map((plantId) => ({
    plantId,
    name: neighborLabel(plantId),
    reason: antagonistReason(hostPlantId, plantId),
  }));
}
