// Mapping veicoli con descrizioni UI
export const VEHICLE_TYPES = [
  { id: 'utilitaria', label: 'Utilitaria', icon: '🚗', desc: 'Fino a 1.400 Kg (Panda, Polo, C1...)', maxKg: 1400 },
  { id: 'car',        label: 'Car / Berlina', icon: '🚙', desc: 'Fino a 2.000 Kg (Golf, Focus, 3008...)', maxKg: 2000 },
  { id: 'suv',        label: 'SUV / Fuoristrada', icon: '🚐', desc: 'Fino a 2.800 Kg (Defender, X5, Grand Cherokee...)', maxKg: 2800 },
  { id: 'van',        label: 'Van / Furgone', icon: '🚚', desc: 'Fino a 3.500 Kg (Transit, Ducato, Sprinter...)', maxKg: 3500 },
  { id: 'van_lungo',  label: 'Van Lungo / Passo Lungo', icon: '🚌', desc: 'Fino a 5.000 Kg (Sprinter XL, Crafter L3...)', maxKg: 5000 },
  { id: 'camper',     label: 'Camper / Motorhome', icon: '🏕️', desc: 'Fino a 5.500 Kg (Camper professionali)', maxKg: 5500 },
  { id: 'truck',      label: 'Truck / Veicolo Pesante', icon: '🚛', desc: 'Oltre 5.000 Kg (veicoli commerciali pesanti)', maxKg: 6000 },
];

// Tipologie di ponte sollevatore (scelta iniziale)
export const LIFT_TYPES = [
  { id: '2_colonne', label: '2 Colonne', icon: '🔧', desc: 'Ponte classico a 2 colonne con bracci articolati.' },
  { id: '4_colonne', label: '4 Colonne', icon: '🏗️', desc: 'Ponte a 4 colonne con pedane piane.' },
];

// Pavimentazione — solo per 2 colonne
export const FLOOR_TYPES = [
  {
    id: 'industriale',
    label: 'Industriale',
    desc: 'Pavimento industriale adatto ad ancoraggio (tasselli diretti)',
    note: 'Modelli C...S — senza pedana',
    color: 'blue',
  },
  {
    id: 'non_industriale',
    label: 'Non Industriale',
    desc: 'Pavimento normale, piastrellato o non adatto ad ancoraggio diretto',
    note: 'Modelli C — con pedana',
    color: 'slate',
  },
];

// Tipologie di impiego — solo per 4 colonne
export const IMPIEGO_TYPES_4COL = [
  { id: 'standard',        label: 'Standard — Sollevamento',      icon: '🛠️' },
  { id: 'assetto',         label: 'Assetto Ruote',                icon: '📐' },
  { id: 'con_sollevatore', label: 'Con Sollevatore Integrato',    icon: '⬆️' },
  { id: 'industriale',     label: 'Industriale — Truck',          icon: '🚛' },
];

// Portata minima richiesta per tipologia veicolo (4 colonne)
export const VEHICLE_MIN_KG = {
  utilitaria: 1400,
  car:        2000,
  suv:        2800,
  van:        3500,
  van_lungo:  4000,
  camper:     4500,
  truck:      5500,   // truck leggeri coperti da C450+/C455+ (5.5Tn)
};

// Seleziona i prodotti 2 colonne compatibili
export function selectProducts2Col(products, pavimentazione, veicolo) {
  if (!pavimentazione || !veicolo) return [];
  return products
    .filter(p =>
      (p.tipo_sollevatore === '2_colonne' || !p.tipo_sollevatore) &&
      p.pavimentazione === pavimentazione &&
      p.veicoli.includes(veicolo)
    )
    .sort((a, b) => (a.prezzoNetto || 0) - (b.prezzoNetto || 0));
}

// Seleziona i prodotti 4 colonne compatibili
export function selectProducts4Col(products, impiego, veicolo) {
  if (!impiego || !veicolo) return [];
  const minKg = VEHICLE_MIN_KG[veicolo] || 0;
  return products
    .filter(p =>
      p.tipo_sollevatore === '4_colonne' &&
      p.impiego === impiego &&
      p.veicoli.includes(veicolo) &&
      p.portataKg >= minKg
    )
    .sort((a, b) => {
      const ap = a.prezzoNetto || 0, bp = b.prezzoNetto || 0;
      if (ap === 0 && bp === 0) return a.portataKg - b.portataKg;
      if (ap === 0) return 1;
      if (bp === 0) return -1;
      return ap - bp;
    });
}

// Back-compat: vecchia API per ponti 2 colonne
export function selectProducts(products, pavimentazione, veicolo) {
  return selectProducts2Col(products, pavimentazione, veicolo);
}

// Genera la motivazione tecnica per la proposta (generica, 2 o 4 col)
export function generateMotivazione(product, veicolo, pavimentazione) {
  const veicoloInfo = VEHICLE_TYPES.find(v => v.id === veicolo);
  const is4Col = product.tipo_sollevatore === '4_colonne';

  if (is4Col) {
    return `${product.modello} con portata ${product.portata} (impiego: ${product.impiego}) è indicato per ${veicoloInfo?.label}. Le pedane piane consentono al veicolo di salire con le ruote senza vincoli sui punti di presa.`;
  }

  const pav = pavimentazione === 'industriale'
    ? 'Il pavimento industriale consente l\'installazione senza pedana, ottimizzando lo spazio in officina.'
    : 'La configurazione con pedana è indicata per pavimenti standard senza ancoraggio diretto.';

  return `${product.modello} con portata ${product.portata} è la soluzione ottimale per ${veicoloInfo?.label}. ${pav}`;
}
