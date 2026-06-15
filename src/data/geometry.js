// ============================================================================
// QFC26 · Layer geometrie del simulatore
// ----------------------------------------------------------------------------
// Trasforma i prodotti Cascos (products.json) in geometrie utilizzabili dal
// motore (engine/simulator.js), e fornisce i template veicolo con i punti di
// presa.
//
// FONTE DATI:
//  - Valori RICAVATI dal campo `noteTecniche` (reali): interno colonne
//    (= "Larghezza portale"), corsa bracci (range "a→b mm"), H.min / H.max.
//  - Valori TEMPLATE (da confermare con dati ufficiali Cascos / costruttore
//    veicolo): rientro perni dalla colonna, distanza attacchi bracci sulla
//    stessa colonna, punti di presa dei veicoli. Sono marcati `template: true`.
//
// Lo stesso disclaimer di LiftPointDB vale qui: i template geometrici vanno
// sostituiti con i dati ufficiali prima di un uso operativo/commerciale.
// ============================================================================

// ── Default template (sovrascrivibili per famiglia in GEOMETRY_OVERRIDES) ──
const DEFAULT_COLUMN_OFFSET_MM = 120;   // rientro perno braccio dalla colonna
const DEFAULT_ARM_MOUNT_MM = 500;       // distanza attacco braccio ant↔post sulla stessa colonna

// ── Override puntuali per modello/famiglia (precedenza sui valori parsati) ──
// Compila qui i dati ufficiali quando disponibili. Esempio:
//   'c5wagon': { columnOffsetMm: 95, armMountDistanceMm: 540 }
export const GEOMETRY_OVERRIDES = {
  // id_prodotto: { internalColumnDistanceMm, columnOffsetMm, armMountDistanceMm,
  //                frontArm:{minMm,maxMm}, rearArm:{minMm,maxMm} }
  //
  // ── FACT-CHECK giugno 2026 — TUTTI i 19 modelli a 2 colonne (schede catalogo) ──
  // armMountDistanceMm = la quota verticale del CARRELLO nel disegno in pianta delle
  // versioni SENZA pedana: 620 mm per la classe 3,2/3,5/4 t e 750 mm per la classe
  // 5/5,5 t. ATTENZIONE: le versioni CON pedana quotano in pianta il telaio base a
  // terra (1400 / 1480 / 1700 mm) — è una feature diversa, NON la distanza attacchi
  // bracci. Il carrello è identico al gemello senza pedana, quindi si usa lo stesso
  // valore (620 / 750). columnOffsetMm (rientro perni) non è leggibile dalle schede:
  // resta al default template (120 mm) — unico campo ancora non verificato.
  //
  // Classe 3,2 / 3,5 / 4 t → carrello 620 mm
  c32:          { armMountDistanceMm: 620 }, // 13120E  C3.2          (con pedana,  base 1400)
  c32_confort:  { armMountDistanceMm: 620 }, // 13120C  C3.2 Confort  (con pedana,  base 1400)
  c32s:         { armMountDistanceMm: 620 }, // 13120SE C3.2S         (senza pedana, quota 620)
  c32s_confort: { armMountDistanceMm: 620 }, // 13120SC C3.2S Confort (senza pedana, quota 620; bracci asimmetrici)
  c35:          { armMountDistanceMm: 620 }, // 13168   C3.5          (con pedana,  base 1480)
  c35s:         { armMountDistanceMm: 620 }, // 13169   C3.5S         (senza pedana, quota 620 — esempio storico)
  c35xl:        { armMountDistanceMm: 620 }, // 13191   C3.5 XL       (con pedana,  base 1480)
  c35s_xl:      { armMountDistanceMm: 620 }, // 13192   C3.5S XL      (senza pedana, quota 620)
  c4:           { armMountDistanceMm: 620 }, // 13194   C4            (con pedana,  base 1480)
  c4xl:         { armMountDistanceMm: 620 }, // 13198   C4 XL         (con pedana,  base 1480)
  c4s:          { armMountDistanceMm: 620 }, // 13194S  C4S           (senza pedana, quota 620)
  c4s_xl:       { armMountDistanceMm: 620 }, // 13198S  C4S XL        (senza pedana, quota 620)
  // Classe 5 / 5,5 t → carrello 750 mm
  c5wagon:      { armMountDistanceMm: 750, internalColumnDistanceMm: 2810 }, // 13176 C5 Wagon — interno 2810 (NON 3000), con pedana base 1700
  c5s_wagon:    { armMountDistanceMm: 750 }, // 13177   C5S Wagon     (senza pedana, interno 3000, quota 750)
  c5xlwagon:    { armMountDistanceMm: 750 }, // 13201   C5 XL Wagon   (con pedana,  base 1700)
  c55:          { armMountDistanceMm: 750 }, // 13998   C5.5          (con pedana,  base 1700)
  c55s:         { armMountDistanceMm: 750 }, // 13998S  C5.5S         (senza pedana, quota 750)
  c55wagon:     { armMountDistanceMm: 750 }, // 13988   C5.5 Wagon    (con pedana,  base 1700)
  c55s_wagon:   { armMountDistanceMm: 750 }, // 13988S  C5.5S Wagon   (senza pedana, quota 750)
};

// ── Parser delle note tecniche ──────────────────────────────────────────────
function num(re, s) {
  const m = s.match(re);
  return m ? parseInt(m[1], 10) : null;
}

/** Estrae tutti i range "a→b mm" (anche con trattino) presenti nel testo. */
function parseArmRanges(s) {
  const ranges = [];
  const re = /(\d{3,4})\s*(?:→|-+>?|–)\s*(\d{3,4})\s*mm/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    ranges.push({ minMm: parseInt(m[1], 10), maxMm: parseInt(m[2], 10) });
  }
  return ranges;
}

/** Analizza il campo noteTecniche e restituisce i parametri geometrici grezzi. */
export function parseNote(note = '') {
  const internal = num(/portale\s*(\d{3,4})\s*mm/i, note);
  const hMin = num(/H\.?\s*Min\s*(\d{2,4})\s*mm/i, note);
  const hMax = num(/H\.?\s*Max\s*(\d{2,4})\s*mm/i, note);
  const ranges = parseArmRanges(note);
  // Quando c'è più di un range (es. triple + doppie), il primo (più lungo)
  // va sull'anteriore, il secondo sul posteriore. Con un solo range, identici.
  const front = ranges[0] || null;
  const rear = ranges[1] || ranges[0] || null;
  return {
    internalColumnDistanceMm: internal,
    minPadHeightMm: hMin,
    maxLiftHeightMm: hMax,
    frontArm: front,
    rearArm: rear,
    parsedRanges: ranges.length,
  };
}

// ── Costruzione geometria + configurazioni per un prodotto ──────────────────
/**
 * Converte un prodotto Cascos a 2 colonne in una geometria per il motore.
 * Restituisce null per i 4 colonne (modello arm-reach non applicabile: vedi
 * docs/SIMULATOR_SPEC.md → estensione 4 colonne).
 */
export function toGeometry(product) {
  const tipo = product.tipo_sollevatore || '2_colonne';
  if (tipo !== '2_colonne') return null;

  const parsed = parseNote(product.noteTecniche);
  const ov = GEOMETRY_OVERRIDES[product.id] || {};

  const internalColumnDistanceMm =
    ov.internalColumnDistanceMm ?? parsed.internalColumnDistanceMm ?? 2700;
  const columnOffsetMm = ov.columnOffsetMm ?? DEFAULT_COLUMN_OFFSET_MM;
  const armMountDistanceMm = ov.armMountDistanceMm ?? DEFAULT_ARM_MOUNT_MM;

  const frontArm = ov.frontArm ?? parsed.frontArm ?? { minMm: 700, maxMm: 1100 };
  const rearArm = ov.rearArm ?? parsed.rearArm ?? frontArm;

  const armTemplate = !ov.armMountDistanceMm; // distanza attacchi è ancora template?
  const colTemplate = !ov.internalColumnDistanceMm && parsed.internalColumnDistanceMm == null;

  // Configurazione standard (perni simmetrici rispetto al centro colonna).
  const configurations = [
    {
      id: 'standard',
      name: 'Standard',
      description:
        'Configurazione standard 2 colonne: attacchi bracci simmetrici sulla colonna. ' +
        (armTemplate ? 'Distanza attacchi e rientro perni sono valori template.' : ''),
      frontPivotYmm: -armMountDistanceMm / 2,
      rearPivotYmm: armMountDistanceMm / 2,
      frontArm,
      rearArm,
      vehicleShiftPresetMm: 0,
    },
  ];

  return {
    id: product.id,
    code: product.modello,
    capacityKg: product.portataKg,
    internalColumnDistanceMm,
    columnOffsetMm,
    armMountDistanceMm,
    minPadHeightMm: parsed.minPadHeightMm,
    maxLiftHeightMm: parsed.maxLiftHeightMm,
    frontArm,
    rearArm,
    configurations,
    template: armTemplate || colTemplate,
    source: product.codice ? `Cascos cod. ${product.codice}` : 'Cascos',
  };
}

// ── Template veicoli (punti di presa) ───────────────────────────────────────
// Mappati sulle categorie di rules.js (VEHICLE_TYPES). Coordinate dei punti di
// presa = TEMPLATE geometrici da sostituire con i punti del costruttore veicolo.
// x = mezza carreggiata punti presa; y = mezzo passo presa (±).
export const VEHICLE_TEMPLATES = [
  { id: 'utilitaria', name: 'Utilitaria',        weightKg: 1200, lengthMm: 3900, widthMm: 1700, halfTrackMm: 650, halfBaseMm: 850,  template: true },
  { id: 'car',        name: 'Car / Berlina',     weightKg: 1700, lengthMm: 4400, widthMm: 1800, halfTrackMm: 700, halfBaseMm: 950,  template: true },
  { id: 'suv',        name: 'SUV / Fuoristrada', weightKg: 2400, lengthMm: 4700, widthMm: 1950, halfTrackMm: 780, halfBaseMm: 1080, template: true },
  { id: 'van',        name: 'Van / Furgone',     weightKg: 3300, lengthMm: 5400, widthMm: 2050, halfTrackMm: 870, halfBaseMm: 1350, template: true },
  { id: 'van_lungo',  name: 'Van Lungo',         weightKg: 4200, lengthMm: 6000, widthMm: 2050, halfTrackMm: 880, halfBaseMm: 1600, template: true },
  { id: 'camper',     name: 'Camper / Motorhome',weightKg: 4800, lengthMm: 6500, widthMm: 2200, halfTrackMm: 900, halfBaseMm: 1750, template: true },
  { id: 'truck',      name: 'Truck leggero',     weightKg: 5500, lengthMm: 7000, widthMm: 2300, halfTrackMm: 950, halfBaseMm: 1900, template: true },
];

/** Espande un template veicolo nei 4 punti di presa usati dal motore. */
export function vehicleLiftPoints(v) {
  return {
    ...v,
    liftPoints: {
      frontLeft:  { x: -v.halfTrackMm, y: -v.halfBaseMm },
      frontRight: { x:  v.halfTrackMm, y: -v.halfBaseMm },
      rearLeft:   { x: -v.halfTrackMm, y:  v.halfBaseMm },
      rearRight:  { x:  v.halfTrackMm, y:  v.halfBaseMm },
    },
    note: 'Template geometrico: sostituire con i punti di presa del costruttore veicolo.',
  };
}

export function getVehicle(id) {
  const v = VEHICLE_TEMPLATES.find((x) => x.id === id) || VEHICLE_TEMPLATES[0];
  return vehicleLiftPoints(v);
}

/** Lista di tutte le geometrie 2 colonne ricavate da un array di prodotti. */
export function buildGeometries(products) {
  return products.map(toGeometry).filter(Boolean);
}
