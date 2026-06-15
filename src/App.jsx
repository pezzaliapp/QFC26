import { useState, useCallback, useEffect, useRef } from 'react';
import productsData from './data/products.json';
import {
  ChevronRight, RotateCcw, FileText, ShoppingCart,
  MessageCircle, Copy, CheckCircle2, ArrowLeft, AlertCircle, Upload,
  Package, Euro, Wrench, Ruler, Download, BookOpen, Plus, Trash2, Check,
  Activity
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Simulator from './components/Simulator.jsx';

// ─── PDF SCHEDE TECNICHE — mappa codice → {file, pages (1-indexed)} ──────────
//
// cascos_con_pedana.pdf (con pedana, modelli senza "S"):
//   p.1-2  → C3.2         (13120E)
//   p.3-4  → C3.2 Monofasici (13183E) — non in products.json, skip
//   p.5-6  → C3.2 Comfort  (13120C)
//   p.7-8  → C3.2 Comfort Monofasici (13183C) — skip
//   p.9-10 → C3.5         (13168)
//   p.11-12→ C3.5XL       (13191)
//   p.13-14→ C4            (13194)
//   p.15-16→ C4XL          (13198)
//   p.17-18→ C5 Wagon      (13176)
//   p.19-20→ C5XL Wagon    (13201)
//   p.21-22→ C5.5          (13998)
//   p.23-24→ C5.5 Wagon    (13988)
//
// cascos_senza_pedana.pdf (senza pedana, modelli con "S"):
//   p.1-2  → C3.2S        (13120SE)
//   p.3-4  → C3.2S Sport  (13120SS) — non in products.json, skip
//   p.5-6  → C3.2S Confort(13120SC)
//   p.7-8  → C3.5S        (13169)
//   p.9-10 → C4S          (13194S)
//   p.11-12→ C3.5S XL     (13192)
//   p.13-14→ C4S XL       (13198S)
//   p.15-16→ C5.5S        (13998S)
//   p.17-18→ C5S Wagon    (13177)
//   p.19-20→ C5.5S Wagon  (13988S)
//
// cascos 4 colonne.pdf (4 colonne, 16 modelli a listino):
//   p.4-5  → C440             (13340)
//   p.8-9  → C443             (13381)
//   p.12-13→ C450 XL          (13376)
//   p.16-17→ C450 TORO        (13351FIR)
//   p.18-19→ C450+            (13378)
//   p.23-24→ C442             (13442)
//   p.25-26→ C445             (13380)
//   p.29-30→ C455 XL          (13377)
//   p.33-34→ C455+            (13379)
//   p.36-37→ C443H            (13370)
//   p.38-39→ C445H            (13359)
//   p.40-41→ C450H            (13371)
//   p.42-43→ C455H            (13367)
//   p.45-46→ C470             (13333)
//   p.47-48→ C472             (13339)
//   p.49-50→ C4100            (13331)

const PDF_SCHEDE = {
  // CON PEDANA
  '13120E':  { file: 'cascos con pedana.pdf',    pages: [1, 2] },
  '13120C':  { file: 'cascos con pedana.pdf',    pages: [5, 6] },
  '13168':   { file: 'cascos con pedana.pdf',    pages: [9, 10] },
  '13191':   { file: 'cascos con pedana.pdf',    pages: [11, 12] },
  '13194':   { file: 'cascos con pedana.pdf',    pages: [13, 14] },
  '13198':   { file: 'cascos con pedana.pdf',    pages: [15, 16] },
  '13176':   { file: 'cascos con pedana.pdf',    pages: [17, 18] },
  '13201':   { file: 'cascos con pedana.pdf',    pages: [19, 20] },
  '13998':   { file: 'cascos con pedana.pdf',    pages: [21, 22] },
  '13988':   { file: 'cascos con pedana.pdf',    pages: [23, 24] },
  // SENZA PEDANA
  '13120SE': { file: 'cascos senza pedana.pdf',  pages: [1, 2] },
  '13120SC': { file: 'cascos senza pedana.pdf',  pages: [5, 6] },
  '13169':   { file: 'cascos senza pedana.pdf',  pages: [7, 8] },
  '13194S':  { file: 'cascos senza pedana.pdf',  pages: [9, 10] },
  '13192':   { file: 'cascos senza pedana.pdf',  pages: [11, 12] },
  '13198S':  { file: 'cascos senza pedana.pdf',  pages: [13, 14] },
  '13998S':  { file: 'cascos senza pedana.pdf',  pages: [15, 16] },
  '13177':   { file: 'cascos senza pedana.pdf',  pages: [17, 18] },
  '13988S':  { file: 'cascos senza pedana.pdf',  pages: [19, 20] },
  // 4 COLONNE
  '13340':    { file: 'cascos 4 colonne.pdf', pages: [4, 5] },
  '13381':    { file: 'cascos 4 colonne.pdf', pages: [8, 9] },
  '13376':    { file: 'cascos 4 colonne.pdf', pages: [12, 13] },
  '13351FIR': { file: 'cascos 4 colonne.pdf', pages: [16, 17] },
  '13378':    { file: 'cascos 4 colonne.pdf', pages: [18, 19] },
  '13442':    { file: 'cascos 4 colonne.pdf', pages: [23, 24] },
  '13380':    { file: 'cascos 4 colonne.pdf', pages: [25, 26] },
  '13377':    { file: 'cascos 4 colonne.pdf', pages: [29, 30] },
  '13379':    { file: 'cascos 4 colonne.pdf', pages: [33, 34] },
  '13370':    { file: 'cascos 4 colonne.pdf', pages: [36, 37] },
  '13359':    { file: 'cascos 4 colonne.pdf', pages: [38, 39] },
  '13371':    { file: 'cascos 4 colonne.pdf', pages: [40, 41] },
  '13367':    { file: 'cascos 4 colonne.pdf', pages: [42, 43] },
  '13333':    { file: 'cascos 4 colonne.pdf', pages: [45, 46] },
  '13339':    { file: 'cascos 4 colonne.pdf', pages: [47, 48] },
  '13331':    { file: 'cascos 4 colonne.pdf', pages: [49, 50] },
};

// Cache dei PDF fetchati (evita doppio download per stesso file)
const pdfCache = {};

async function getPdfLib() {
  if (window.PDFLib) return window.PDFLib;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js';
    s.onload = () => resolve(window.PDFLib);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function fetchPdfBytes(fileName) {
  if (pdfCache[fileName]) return pdfCache[fileName];
  // import.meta.env.BASE_URL = base Vite. I PDF devono stare in public/.
  const base = import.meta.env.BASE_URL || '/';
  const path = base.endsWith('/') ? `${base}${fileName}` : `${base}/${fileName}`;
  const url = encodeURI(path); // gestisce gli spazi nei nomi file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Catalogo "${fileName}" non trovato in public/. Aggiungi i 3 PDF Cascos alla cartella public/.`);
  }
  const bytes = await response.arrayBuffer();
  // Se il file manca, il dev/SPA server risponde con index.html (HTML) e HTTP 200.
  // Verifica la firma "%PDF" per dare un errore chiaro invece di "No PDF header found".
  const sig = String.fromCharCode(...new Uint8Array(bytes.slice(0, 5)));
  if (!sig.startsWith('%PDF')) {
    throw new Error(`Catalogo "${fileName}" mancante in public/. Copia i 3 PDF Cascos nella cartella public/ e ricarica.`);
  }
  pdfCache[fileName] = bytes;
  return bytes;
}

async function extractSchedaTecnica(codice) {
  const mapping = PDF_SCHEDE[codice];
  if (!mapping) throw new Error(`Nessuna scheda tecnica per codice ${codice}`);
  const PDFLib = await getPdfLib();
  const { PDFDocument } = PDFLib;
  const srcBytes = await fetchPdfBytes(mapping.file);
  const srcDoc = await PDFDocument.load(srcBytes);
  const newDoc = await PDFDocument.create();
  for (const pageNum of mapping.pages) {
    const [page] = await newDoc.copyPages(srcDoc, [pageNum - 1]);
    newDoc.addPage(page);
  }
  const newBytes = await newDoc.save();
  return { bytes: newBytes, fileName: `Cascos_${codice}_SchedaTecnica.pdf` };
}

// Unica azione esposta: scarica il PDF estratto.
// "Apri in tab" rimosso: Chrome blocca blob URL su tab aperta programmaticamente.
// Il download funziona in tutti i browser senza restrizioni.
async function downloadSchedaTecnica(codice) {
  const { bytes, fileName } = await extractSchedaTecnica(codice);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── DATI BRACCI DAL PDF ──────────────────────────────────────────────────────

const BRACCI_PER_FAMIGLIA = {
  'C3.2':    { minMm: 710,  maxMm: 1050, note: 'Bracci doppi — utilitarie e citycar' },
  'C3.2S':   { minMm: 710,  maxMm: 1050, note: 'Bracci doppi — utilitarie e citycar' },
  'C3.2_CONFORT':  { minMm: 597, maxMm: 1122, note: '2 braccia triple + 2 doppie — range esteso' },
  'C3.2S_CONFORT': { minMm: 597, maxMm: 1122, note: '2 braccia triple + 2 doppie — range esteso' },
  'C3.5':    { minMm: 690,  maxMm: 1325, note: '4 braccia triple' },
  'C3.5S':   { minMm: 690,  maxMm: 1325, note: '4 braccia triple — senza pedana' },
  'C4':      { minMm: 668,  maxMm: 1341, note: '4 braccia triple — SUV e furgoni leggeri' },
  'C4S':     { minMm: 668,  maxMm: 1341, note: '4 braccia triple — senza pedana' },
  'C5.5':    { minMm: 705,  maxMm: 1335, note: 'Doppio gioco supporti 60-100mm' },
  'C5.5S':   { minMm: 705,  maxMm: 1335, note: 'Doppio gioco supporti 60-100mm — senza pedana' },
  'C5.5_WAGON':  { minMm: 758, maxMm: 1505, note: 'Bracci extra-lunghi — grandi furgoni' },
  'C5.5S_WAGON': { minMm: 758, maxMm: 1505, note: 'Bracci extra-lunghi — senza pedana' },
  'C5':      { minMm: 855,  maxMm: 1810, note: 'Bracci extra-lunghi — passo lungo' },
  'C5S':     { minMm: 855,  maxMm: 1810, note: 'Bracci extra-lunghi — senza pedana' },
};

function getBracciInfo(product) {
  const id = product.id;
  const famiglia = product.famiglia;
  if (id === 'c32_confort')   return BRACCI_PER_FAMIGLIA['C3.2_CONFORT'];
  if (id === 'c32s_confort')  return BRACCI_PER_FAMIGLIA['C3.2S_CONFORT'];
  if (id === 'c55wagon')      return BRACCI_PER_FAMIGLIA['C5.5_WAGON'];
  if (id === 'c55s_wagon')    return BRACCI_PER_FAMIGLIA['C5.5S_WAGON'];
  if (id === 'c5wagon')       return BRACCI_PER_FAMIGLIA['C5'];
  if (id === 'c5xlwagon')     return BRACCI_PER_FAMIGLIA['C5'];
  if (id === 'c5s_wagon')     return BRACCI_PER_FAMIGLIA['C5S'];
  return BRACCI_PER_FAMIGLIA[famiglia] || null;
}

// ─── LOGICA DI SELEZIONE ──────────────────────────────────────────────────────

function selectProducts(products, pavimentazione, veicolo, distanzaMm) {
  return products
    .filter(p => {
      // I prodotti senza tipo_sollevatore esplicito sono considerati 2_colonne (retrocompatibilità)
      const tipo = p.tipo_sollevatore || '2_colonne';
      if (tipo !== '2_colonne') return false;
      if (p.pavimentazione !== pavimentazione) return false;
      if (!p.veicoli.includes(veicolo)) return false;
      const bracci = getBracciInfo(p);
      if (!bracci) return false;
      return distanzaMm >= bracci.minMm && distanzaMm <= bracci.maxMm;
    })
    .sort((a, b) => a.prezzoNetto - b.prezzoNetto);
}

// Seleziona i prodotti a 4 colonne in base all'impiego (standard / assetto / con_sollevatore /
// industriale) e al veicolo. La portata minima richiesta dal veicolo è in VEHICLE_MIN_KG.
function selectProducts4Col(products, impiego, veicolo) {
  const minKg = VEHICLE_MIN_KG[veicolo] ?? 0;
  return products
    .filter(p => {
      if (p.tipo_sollevatore !== '4_colonne') return false;
      if (p.impiego !== impiego) return false;
      if (!p.veicoli.includes(veicolo)) return false;
      if (typeof p.portataKg === 'number' && p.portataKg < minKg) return false;
      return true;
    })
    .sort((a, b) => {
      // Prima i prodotti con prezzo > 0, ordinati per prezzo; in coda quelli a 0 (prezzo da listino)
      const pa = a.prezzoNetto > 0 ? a.prezzoNetto : Number.MAX_SAFE_INTEGER;
      const pb = b.prezzoNetto > 0 ? b.prezzoNetto : Number.MAX_SAFE_INTEGER;
      return pa - pb;
    });
}

// ─── TIPI VEICOLO ─────────────────────────────────────────────────────────────

const VEHICLE_TYPES = [
  { id: 'utilitaria', label: 'Utilitaria',              icon: '🚗', desc: 'Fino a 1.400 Kg — Panda, Polo, C1...' },
  { id: 'car',        label: 'Car / Berlina',            icon: '🚙', desc: 'Fino a 2.000 Kg — Golf, Focus, 3008...' },
  { id: 'suv',        label: 'SUV / Fuoristrada',        icon: '🚐', desc: 'Fino a 2.800 Kg — Defender, X5, Grand Cherokee...' },
  { id: 'van',        label: 'Van / Furgone',            icon: '🚚', desc: 'Fino a 3.500 Kg — Transit, Ducato, Sprinter...' },
  { id: 'van_lungo',  label: 'Van Lungo / Passo Lungo',  icon: '🚌', desc: 'Fino a 5.000 Kg — Sprinter XL, Crafter L3...' },
  { id: 'camper',     label: 'Camper / Motorhome',       icon: '🏕️', desc: 'Fino a 5.500 Kg — Camper professionali' },
  { id: 'truck',      label: 'Truck / Veicolo Pesante',  icon: '🚛', desc: 'Oltre 5.000 Kg — veicoli commerciali pesanti' },
];

const FLOOR_TYPES = [
  { id: 'industriale',     label: 'Industriale',     desc: 'Pavimento industriale adatto ad ancoraggio (tasselli diretti)', note: 'Modelli C...S — senza pedana', color: 'blue' },
  { id: 'non_industriale', label: 'Non Industriale', desc: 'Pavimento normale, piastrellato o non adatto ad ancoraggio diretto', note: 'Modelli C — con pedana', color: 'slate' },
];

const DISTANZA_PRESETS = [
  { mm: 750,  label: '~750 mm',  desc: 'Utilitaria compatta (Panda, C1, Polo)',           veicoli: ['utilitaria'] },
  { mm: 950,  label: '~950 mm',  desc: 'Utilitaria / Berlina (Punto, Clio, Golf compact)', veicoli: ['utilitaria', 'car'] },
  { mm: 870,  label: '~870 mm',  desc: 'Berlina media (Golf, Focus, 208)',                 veicoli: ['car'] },
  { mm: 1050, label: '~1050 mm', desc: 'Berlina grande / Wagon (Passat, Octavia)',         veicoli: ['car'] },
  { mm: 1250, label: '~1250 mm', desc: 'Berlina XL / Car spaziosa',                       veicoli: ['car'] },
  { mm: 900,  label: '~900 mm',  desc: 'SUV compatto (Kuga, Qashqai, 2008)',              veicoli: ['suv'] },
  { mm: 1100, label: '~1100 mm', desc: 'SUV medio (X3, RAV4, Tiguan)',                    veicoli: ['suv'] },
  { mm: 1300, label: '~1300 mm', desc: 'SUV grande / Fuoristrada (X5, Defender, Grand Cherokee)', veicoli: ['suv'] },
  { mm: 800,  label: '~800 mm',  desc: 'Van compatto (Berlingo, Connect)',                 veicoli: ['van'] },
  { mm: 1000, label: '~1000 mm', desc: 'Furgone medio (Ducato L2, Transit L2)',            veicoli: ['van'] },
  { mm: 1300, label: '~1300 mm', desc: 'Furgone grande (Sprinter L3, Crafter)',            veicoli: ['van'] },
  { mm: 900,  label: '~900 mm',  desc: 'Van lungo leggero (Sprinter L3)',                  veicoli: ['van_lungo'] },
  { mm: 1200, label: '~1200 mm', desc: 'Van lungo medio (Crafter L4, Transit XL)',         veicoli: ['van_lungo'] },
  { mm: 1400, label: '~1400 mm', desc: 'Van lungo grande (passo lungo XL)',                veicoli: ['van_lungo'] },
  { mm: 1700, label: '~1700 mm', desc: 'Van lungo extra — bracci massimi (855->1810mm)',   veicoli: ['van_lungo'] },
  { mm: 900,  label: '~900 mm',  desc: 'Camper compatto (base Ducato/Sprinter)',           veicoli: ['camper'] },
  { mm: 1200, label: '~1200 mm', desc: 'Camper medio',                                     veicoli: ['camper'] },
  { mm: 1400, label: '~1400 mm', desc: 'Camper grande / Motorhome',                        veicoli: ['camper'] },
  { mm: 1700, label: '~1700 mm', desc: 'Motorhome XL — bracci max (855->1810mm)',          veicoli: ['camper'] },
  { mm: 900,  label: '~900 mm',  desc: 'Truck leggero (Daily 35, Transit pesante)',        veicoli: ['truck'] },
  { mm: 1200, label: '~1200 mm', desc: 'Truck medio',                                      veicoli: ['truck'] },
  { mm: 1450, label: '~1450 mm', desc: 'Truck pesante — bracci max wagon (758->1505mm)',   veicoli: ['truck'] },
];

// ─── TIPO SOLLEVATORE (2 / 4 COLONNE) ────────────────────────────────────────

const LIFT_TYPES = [
  { id: '2_colonne', label: '2 Colonne',  icon: '🏛️', desc: 'Sollevatori a due colonne — configurazione classica su pavimento industriale o con pedana' },
  { id: '4_colonne', label: '4 Colonne',  icon: '🏗️', desc: 'Sollevatori a quattro colonne — assetto, prove tecniche, veicoli pesanti e industriali' },
];

// Tipologie di impiego per i 4 colonne (da catalogo Cascos)
const IMPIEGO_TYPES_4COL = [
  { id: 'standard',         label: 'Standard',          desc: 'Sollevamento, manutenzione ordinaria',                icon: '🧰' },
  { id: 'assetto',          label: 'Assetto / Allineamento', desc: 'Con piatti rotanti e scorrevoli integrati',        icon: '🎯' },
  { id: 'con_sollevatore',  label: 'Con Sollevatore Integrato', desc: 'Pedana con sollevatore ausiliario integrato',   icon: '⬆️' },
  { id: 'industriale',      label: 'Industriale / Pesante',   desc: 'Portate elevate per truck e veicoli commerciali', icon: '🚛' },
];

// Portata minima del sollevatore in base al tipo di veicolo (in kg)
// Le soglie tengono conto di un margine di sicurezza rispetto al peso massimo del veicolo.
const VEHICLE_MIN_KG = {
  utilitaria: 1400,
  car:        2000,
  suv:        2800,
  van:        3500,
  van_lungo:  4000,
  camper:     4500,
  truck:      5500,
};

// ─── HOOKS ───────────────────────────────────────────────────────────────────

// Controlla ogni 2 minuti se e' disponibile una nuova versione dell'app.
// Confronta il hash degli asset in index.html: cambia ad ogni npm run build.
function useAppUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const currentSignature = useRef(null);

  useEffect(() => {
    const CHECK_INTERVAL = 2 * 60 * 1000; // 2 minuti

    async function checkVersion() {
      try {
        const base = import.meta.env.BASE_URL || '/';
        const url = `${base}`.replace(/\/$/, '') + '/';
        // Aggiunge cache-busting per evitare risposte cached
        const res = await fetch(url + '?_=' + Date.now(), {
          cache: 'no-store',
          headers: { pragma: 'no-cache' }
        });
        const html = await res.text();
        // Estrae tutti gli src/href hashati degli asset Vite (es. index-BxKl9.js)
        const matches = html.match(/\/(assets\/[^"']+\.(js|css))/g) || [];
        const signature = matches.sort().join('|');
        if (!signature) return;
        if (currentSignature.current === null) {
          // Prima lettura: salva la firma corrente
          currentSignature.current = signature;
        } else if (currentSignature.current !== signature) {
          // Firma cambiata: nuova versione disponibile
          setUpdateAvailable(true);
        }
      } catch {
        // Rete non disponibile — silenzioso
      }
    }

    checkVersion();
    const timer = setInterval(checkVersion, CHECK_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  return updateAvailable;
}

const LS_KEY      = 'quoteflow_prezzi_v1';
const LS_INFO_KEY = 'quoteflow_listino_info_v1';

function useProducts() {
  // Inizializza da localStorage se disponibile.
  // Se non c'e' nessun listino caricato, i prodotti esistono (per nomi/descrizioni)
  // ma prezzoNetto = null → l'app blocca l'accesso al configuratore.
  const [products, setProducts] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    // Nessun listino: rimuove i prezzi dal catalogo base
    return productsData.map(p => ({ ...p, prezzoNetto: null }));
  });

  // Info sull'ultimo listino caricato (nome file, data, ora)
  const [listinoInfo, setListinoInfo] = useState(() => {
    try {
      const info = localStorage.getItem(LS_INFO_KEY);
      return info ? JSON.parse(info) : null;
    } catch {
      return null;
    }
  });

  const importFromExcel = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target.result, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

          let headerIdx = rows.findIndex(r =>
            r.some(c => typeof c === 'string' && c.toLowerCase().includes('riferimento'))
          );
          if (headerIdx === -1) headerIdx = 3;

          const headers = rows[headerIdx];
          const colRef = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('riferimento'));
          const colPre = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('netto'));

          const updated = [...productsData].map(p => {
            for (let i = headerIdx + 1; i < rows.length; i++) {
              const row = rows[i];
              const codiceRow = String(row[colRef] || '').trim();
              if (codiceRow === String(p.codice)) {
                const prezzoVal = parseFloat(String(row[colPre] || '').replace(/[^\d.]/g, ''));
                if (!isNaN(prezzoVal)) return { ...p, prezzoNetto: prezzoVal };
              }
            }
            return p;
          });

          // Salva prezzi e metadata in localStorage
          const info = {
            fileName: file.name,
            data: new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            ora:  new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
          };
          localStorage.setItem(LS_KEY, JSON.stringify(updated));
          localStorage.setItem(LS_INFO_KEY, JSON.stringify(info));

          setProducts(updated);
          setListinoInfo(info);
          resolve(updated.length);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }, []);

  // Rimuove listino e torna a prezzi null (nessun listino attivo)
  const resetPrices = useCallback(() => {
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(LS_INFO_KEY);
    setProducts(productsData.map(p => ({ ...p, prezzoNetto: null })));
    setListinoInfo(null);
  }, []);

  return { products, importFromExcel, listinoInfo, resetPrices };
}

// ─── FORMATTERS ──────────────────────────────────────────────────────────────

const formatPrice = (n) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', minimumFractionDigits: 0 }).format(n);

const today = () => new Date().toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });

const generateDocumentText = ({ mode, customer, items, note, sconto, imponibile, scontoEuro, prezzoFinale }) => {
  const docType = mode === 'order' ? 'ORDINE' : 'PREVENTIVO';
  const customerName = customer.azienda || customer.nome || '—';

  const righeProdotti = items.map((it, idx) => {
    const { product, config, qty } = it;
    const vehicleInfo = VEHICLE_TYPES.find(v => v.id === config.veicolo);
    const tipoSollevatore = config.tipoSollevatore || '2_colonne';
    const is4Col = tipoSollevatore === '4_colonne';
    const totaleRiga = product.prezzoNetto * qty;

    // Dettagli configurazione variano per 2col/4col
    let dettagliConfig = '';
    if (is4Col) {
      const impiegoLabel = IMPIEGO_TYPES_4COL.find(t => t.id === config.impiego)?.label || '—';
      dettagliConfig = `Tipo sollevatore: 4 Colonne
Impiego: ${impiegoLabel}
Veicolo: ${vehicleInfo?.label || '—'}
Pavimentazione: Universale (4 colonne)`;
    } else {
      const floorLabel = FLOOR_TYPES.find(f => f.id === config.pavimentazione)?.label || '—';
      const bracciInfo = getBracciInfo(product);
      dettagliConfig = `Tipo sollevatore: 2 Colonne
Pavimentazione: ${floorLabel}
Veicolo: ${vehicleInfo?.label || '—'}
Distanza punti di presa: ${config.distanzaMm} mm
Range bracci: ${bracciInfo ? `Min ${bracciInfo.minMm} mm - Max ${bracciInfo.maxMm} mm` : '—'}
Configurazione: ${product.pavimentazione === 'industriale' ? 'Senza Pedana' : 'Con Pedana'}`;
    }

    return `--- Articolo ${idx + 1} ---
Prodotto: ${product.modello}
Codice: ${product.codice}
Descrizione: ${product.descrizione}
Portata: ${product.portata}
Categoria: ${product.categoria}
${dettagliConfig}
Quantita: ${qty}
Prezzo unitario netto: ${formatPrice(product.prezzoNetto)}
Totale riga: ${formatPrice(totaleRiga)}
Note tecniche: ${product.noteTecniche || '—'}`;
  }).join('\n\n');

  return `${docType} CASCOS BY CORMACH

Data: ${today()}
Cliente: ${customerName}
Contatto: ${customer.telefono || '—'}
Email: ${customer.email || '—'}
Indirizzo: ${customer.indirizzo || '—'}

Numero articoli: ${items.length}

${righeProdotti}

--- RIEPILOGO ---
Imponibile: ${formatPrice(imponibile)}
` +
    (sconto > 0 ? `Sconto ${sconto}%: -${formatPrice(scontoEuro)}\n` : '') +
    `Totale netto: ${formatPrice(prezzoFinale)}
IVA: esclusa

Note: ${note || '—'}

CASCOS by Cormach Correggio Machinery`;
};

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
        <Wrench size={18} className="text-white" />
      </div>
      <div>
        <div className="text-sm font-bold text-white leading-none">QuoteFlow R0426</div>
        <div className="text-xs text-slate-400 leading-none mt-0.5">Cascos · 2 e 4 Colonne</div>
      </div>
    </div>
  );
}

function Badge({ text, color = 'blue' }) {
  const cls = {
    blue:   'bg-blue-500/20 text-blue-300 border border-blue-500/30',
    green:  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    amber:  'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    slate:  'bg-slate-500/20 text-slate-300 border border-slate-500/30',
    violet: 'bg-violet-500/20 text-violet-300 border border-violet-500/30',
    red:    'bg-red-500/20 text-red-300 border border-red-500/30',
  }[color] || 'bg-blue-500/20 text-blue-300';
  return <span className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{text}</span>;
}

function StepIndicator({ current, total = 4 }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
            ${i < current ? 'bg-blue-600 text-white' : i === current ? 'bg-blue-500 text-white ring-2 ring-blue-300/50' : 'bg-slate-700 text-slate-500'}`}>
            {i < current ? <CheckCircle2 size={14} /> : i + 1}
          </div>
          {i < total - 1 && <div className={`h-px w-6 transition-all ${i < current ? 'bg-blue-500' : 'bg-slate-700'}`} />}
        </div>
      ))}
    </div>
  );
}

// ─── SCHEDA TECNICA BUTTON ────────────────────────────────────────────────────

function SchedaTecnicaButton({ codice, modello, compact = false }) {
  const [stato, setStato] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleDownload = async () => {
    setStato('loading');
    setErrorMsg('');
    try {
      await downloadSchedaTecnica(codice);
      setStato('done');
      setTimeout(() => setStato('idle'), 3000);
    } catch (err) {
      setStato('error');
      setErrorMsg(err.message || 'Errore download');
    }
  };

  const label = stato === 'loading' ? 'Preparazione...'
              : stato === 'done'    ? 'Scaricato'
              : stato === 'error'   ? 'Errore'
              : 'Scarica Scheda PDF';

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={handleDownload}
          disabled={stato === 'loading'}
          className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors disabled:opacity-50"
        >
          <Download size={12} />
          {label}
        </button>
        {stato === 'error' && errorMsg && (
          <span className="text-xs text-red-400">{errorMsg}</span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={handleDownload}
        disabled={stato === 'loading'}
        className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium transition-all
          bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 hover:text-sky-200 disabled:opacity-50"
      >
        <Download size={15} />
        {label}
      </button>
      {stato === 'error' && errorMsg && (
        <p className="text-xs text-red-400 px-1">{errorMsg}</p>
      )}
      <p className="text-xs text-slate-600 px-1">
        Depliant ufficiale Cascos estratto dal catalogo · 2 pagine
      </p>
    </div>
  );
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────

function ProductCard({ product, isRecommended, onSelect, onSimulate, mode, alreadyInCart }) {
  const is4Col = product.tipo_sollevatore === '4_colonne';
  const floorLabel = is4Col
    ? 'Pav. Universale'
    : (product.pavimentazione === 'industriale' ? 'Pav. Industriale' : 'Pav. Standard');
  const floorColor = is4Col
    ? 'violet'
    : (product.pavimentazione === 'industriale' ? 'blue' : 'slate');
  const bracciInfo = is4Col ? null : getBracciInfo(product);
  const hasPdf = !!PDF_SCHEDE[product.codice];
  const hasPrice = typeof product.prezzoNetto === 'number' && product.prezzoNetto > 0;

  return (
    <div
      className={`relative rounded-xl p-5 transition-all duration-200 animate-slide-up
        ${isRecommended
          ? 'glass border-blue-500/50 ring-1 ring-blue-500/30 hover:ring-blue-400/60'
          : 'glass hover:border-slate-500/60'} glass-hover`}
    >
      {isRecommended && (
        <div className="absolute -top-2.5 left-4">
          <span className="bg-blue-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">
            Consigliato
          </span>
        </div>
      )}
      {alreadyInCart && (
        <div className="absolute -top-2.5 right-4">
          <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-0.5 rounded-full flex items-center gap-1">
            <Check size={11} /> Aggiunto
          </span>
        </div>
      )}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="text-lg font-bold text-white">{product.modello}</div>
          <div className="font-mono text-xs text-slate-400 mt-0.5">Rif. {product.codice}</div>
        </div>
        <div className="text-right">
          {hasPrice ? (
            <>
              <div className="text-xl font-bold text-blue-400">{formatPrice(product.prezzoNetto)}</div>
              <div className="text-xs text-slate-500">prezzo netto</div>
            </>
          ) : (
            <>
              <div className="text-sm font-bold text-amber-300">Prezzo da listino</div>
              <div className="text-xs text-slate-500">carica file Excel</div>
            </>
          )}
        </div>
      </div>

      <p className="text-sm text-slate-300 mb-3 leading-relaxed">{product.descrizione}</p>

      <div className="flex flex-wrap gap-2 mb-3">
        <Badge text={product.portata} color="green" />
        <Badge text={floorLabel} color={floorColor} />
        <Badge text={product.categoria} color="amber" />
        {is4Col && <Badge text="4 Colonne" color="violet" />}
        {hasPdf && <Badge text="Scheda PDF" color="slate" />}
      </div>

      {bracciInfo && (
        <div className="flex items-center gap-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-2 mb-3">
          <Ruler size={13} className="flex-shrink-0" />
          <span>
            Bracci: Min <strong>{bracciInfo.minMm} mm</strong> - Max <strong>{bracciInfo.maxMm} mm</strong>
            <span className="text-slate-400 ml-1">· {bracciInfo.note}</span>
          </span>
        </div>
      )}

      <div className="text-xs text-slate-500 border-t border-slate-700 pt-3 mb-3">
        {product.noteTecniche}
      </div>

      {(hasPdf || onSimulate) && (
        <div className="border-t border-slate-700/50 pt-3 mb-3 flex flex-wrap items-center gap-2">
          {hasPdf && (
            <SchedaTecnicaButton codice={product.codice} modello={product.modello} compact />
          )}
          {onSimulate && (
            <button
              onClick={() => onSimulate(product)}
              className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              title={is4Col ? 'Apri il simulatore drive-on per questo modello' : 'Apri il simulatore geometrico per questo modello'}
            >
              <Activity size={13} /> {is4Col ? 'Simula drive-on' : 'Simula presa bracci'}
            </button>
          )}
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => hasPrice && onSelect(product)}
          disabled={!hasPrice}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
            !hasPrice
              ? 'text-slate-500 cursor-not-allowed'
              : alreadyInCart
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-blue-400 hover:text-blue-300'
          }`}
        >
          {!hasPrice
            ? <><AlertCircle size={14} /> Prezzo non disponibile</>
            : <>
                {alreadyInCart ? <Plus size={14} /> : (mode === 'order' ? <ShoppingCart size={14} /> : <FileText size={14} />)}
                {alreadyInCart ? 'Aggiungi ancora' : `Aggiungi al ${mode === 'order' ? 'ordine' : 'preventivo'}`}
                <ChevronRight size={14} />
              </>}
        </button>
      </div>
    </div>
  );
}

// ─── VIEWS ────────────────────────────────────────────────────────────────────

function DashboardView({ onStart, onImport, importStatus, listinoInfo, onResetPrices }) {
  const handleFileDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files[0] || e.target.files?.[0];
    if (file) onImport(file);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">Cascos Lifts</h1>
        <p className="text-slate-400 text-sm">Configuratore preventivi e ordini — Cormach Srl</p>
      </div>

      {listinoInfo ? (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => onStart('quote')}
            className="glass glass-hover rounded-xl p-5 text-left hover:scale-[1.02] transition-all"
          >
            <FileText size={22} className="text-blue-400 mb-3" />
            <div className="font-bold text-white mb-1">Preventivo</div>
            <div className="text-xs text-slate-400">Crea un preventivo per il cliente</div>
          </button>
          <button
            onClick={() => onStart('order')}
            className="glass glass-hover rounded-xl p-5 text-left hover:scale-[1.02] transition-all"
          >
            <ShoppingCart size={22} className="text-emerald-400 mb-3" />
            <div className="font-bold text-white mb-1">Ordine</div>
            <div className="text-xs text-slate-400">Crea un ordine confermato</div>
          </button>
        </div>
      ) : (
        <div className="glass rounded-xl p-5 border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
          <AlertCircle size={20} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-amber-300 mb-1">Listino prezzi richiesto</div>
            <div className="text-xs text-slate-400">
              Carica il file Excel del listino qui sotto per abilitare preventivi e ordini.
            </div>
          </div>
        </div>
      )}

      {/* ─── SEZIONE LISTINO ─────────────────────────────────────────────── */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
            <Upload size={15} className="text-blue-400" />
            Aggiorna Listino Excel
          </div>
          {importStatus && (
            <Badge
              text={importStatus.includes('Errore') ? importStatus : `Aggiornato: ${importStatus}`}
              color={importStatus.includes('Errore') ? 'amber' : 'green'}
            />
          )}
        </div>

        {/* Stato listino attivo */}
        {listinoInfo ? (
          <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-emerald-300 font-semibold">Listino attivo</p>
              <p className="text-xs text-slate-400 truncate">{listinoInfo.fileName}</p>
              <p className="text-xs text-slate-500">Caricato il {listinoInfo.data} alle {listinoInfo.ora}</p>
            </div>
            <button
              onClick={onResetPrices}
              title="Ripristina prezzi base"
              className="ml-3 flex-shrink-0 text-xs text-slate-500 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
            >
              Reset
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-500 mb-3">
            Nessun listino caricato — prezzi base attivi. Importa l'Excel per aggiornare i prezzi netti. Colonne attese: Riferimento, Netto Riv. (€).
          </p>
        )}

        {/* Drop zone */}
        <label
          className="block border-2 border-dashed border-slate-700 rounded-lg p-4 text-center cursor-pointer hover:border-blue-500/50 transition-colors"
          onDragOver={e => e.preventDefault()}
          onDrop={handleFileDrop}
        >
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileDrop} />
          <span className="text-sm text-slate-400">
            Trascina qui il file Excel o <span className="text-blue-400 underline">seleziona</span>
          </span>
        </label>
      </div>

      {/* ─── SCHEDE TECNICHE ─────────────────────────────────────────────── */}
      <div className="glass rounded-xl p-4 border border-sky-500/20">
        <div className="flex items-center gap-2 text-sm font-medium text-sky-300 mb-2">
          <BookOpen size={15} />
          Schede Tecniche PDF
        </div>
        <p className="text-xs text-slate-400">
          Per ogni prodotto selezionato puoi aprire o scaricare la scheda tecnica ufficiale Cascos, estratta automaticamente dal catalogo.
          Disponibile nelle schede risultati e nel preventivo generato.
        </p>
      </div>

      {/* ─── STATS ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { icon: <Package size={18}/>, label: 'Prodotti', value: productsData.length },
          { icon: <BookOpen size={18}/>, label: 'PDF Schede', value: Object.keys(PDF_SCHEDE).length },
          { icon: <Euro size={18}/>, label: 'Prezzi', value: listinoInfo ? 'Personalizzati' : 'Base 2026' },
        ].map((c, i) => (
          <div key={i} className="glass rounded-xl p-3">
            <div className="text-slate-400 flex justify-center mb-1">{c.icon}</div>
            <div className={`text-lg font-bold ${i === 2 && listinoInfo ? 'text-emerald-400 text-sm' : 'text-white'}`}>
              {c.value}
            </div>
            <div className="text-xs text-slate-500">{c.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── CONFIGURATOR VIEW (4 step) ───────────────────────────────────────────────

function ConfiguratorView({ mode, products, onResult, onBack }) {
  // Tipo di sollevatore scelto: null = ancora da scegliere, poi '2_colonne' o '4_colonne'
  const [tipoSollevatore, setTipoSollevatore] = useState(null);

  // State condiviso / 2 colonne
  const [step, setStep]               = useState(0);
  const [pavimentazione, setPav]      = useState(null);
  const [veicolo, setVeicolo]         = useState(null);
  const [distanzaMm, setDistanza]     = useState(null);
  const [sliderVal, setSliderVal]     = useState(950);
  const [useSlider, setUseSlider]     = useState(false);

  // State specifico 4 colonne
  const [impiego, setImpiego]         = useState(null);

  // ─── Handlers 2 colonne ───────────────────────────────────────────────────
  const handleFloor   = (id) => { setPav(id); setStep(1); };
  const handleVehicle2Col = (id) => { setVeicolo(id); setStep(2); };

  const handlePreset = (mm) => {
    setDistanza(mm);
    const results = selectProducts(products, pavimentazione, veicolo, mm);
    onResult({ tipoSollevatore: '2_colonne', pavimentazione, veicolo, distanzaMm: mm, results });
  };

  const handleSliderConfirm = () => {
    const mm = sliderVal;
    setDistanza(mm);
    const results = selectProducts(products, pavimentazione, veicolo, mm);
    onResult({ tipoSollevatore: '2_colonne', pavimentazione, veicolo, distanzaMm: mm, results });
  };

  // ─── Handlers 4 colonne ───────────────────────────────────────────────────
  const handleImpiego = (id) => { setImpiego(id); setStep(1); };
  const handleVehicle4Col = (id) => {
    setVeicolo(id);
    const results = selectProducts4Col(products, impiego, id);
    onResult({ tipoSollevatore: '4_colonne', impiego, veicolo: id, results });
  };

  // ─── Reset e back ─────────────────────────────────────────────────────────
  const handleBackInternal = () => {
    if (tipoSollevatore === null) {
      onBack();
      return;
    }
    if (step === 0) {
      // Torna alla scelta del tipo di sollevatore
      setTipoSollevatore(null);
      setPav(null); setVeicolo(null); setDistanza(null); setImpiego(null);
      return;
    }
    setStep(s => s - 1);
  };

  const presetsPerVeicolo = DISTANZA_PRESETS.filter(p =>
    !veicolo || p.veicoli.includes(veicolo)
  ).filter((p, i, arr) => arr.findIndex(x => x.mm === p.mm && x.desc === p.desc) === i);

  // Numero di step totali nell'indicatore (compreso quello di scelta tipo, step -1 logico)
  // 2 colonne: 4 step visivi (tipo, pav, veicolo, distanza)
  // 4 colonne: 3 step visivi (tipo, impiego, veicolo)
  const totalSteps = tipoSollevatore === '4_colonne' ? 3 : 4;
  const currentStepVisual = tipoSollevatore === null ? 0 : step + 1;

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={handleBackInternal}
          className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {mode === 'order' ? 'Nuovo Ordine' : 'Nuovo Preventivo'}
            {tipoSollevatore && (
              <span className="ml-2 text-blue-400">
                · {tipoSollevatore === '2_colonne' ? '2 Colonne' : '4 Colonne'}
              </span>
            )}
          </div>
          <StepIndicator current={currentStepVisual} total={totalSteps} />
        </div>
      </div>

      {/* ─── STEP -1: Scelta tipo sollevatore ────────────────────────────── */}
      {tipoSollevatore === null && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-1">Tipo di Sollevatore</h2>
          <p className="text-sm text-slate-400 mb-5">
            Scegli la famiglia di sollevatori: 2 colonne per configurazione classica,
            4 colonne per assetto, prove e veicoli pesanti.
          </p>
          <div className="space-y-3">
            {LIFT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => { setTipoSollevatore(t.id); setStep(0); }}
                className="w-full glass glass-hover rounded-xl p-5 text-left flex items-center gap-4 transition-all hover:scale-[1.01]"
              >
                <span className="text-3xl w-10 text-center">{t.icon}</span>
                <div className="flex-1">
                  <div className="text-lg font-bold text-white mb-1">{t.label}</div>
                  <div className="text-sm text-slate-400">{t.desc}</div>
                </div>
                <ChevronRight size={18} className="text-slate-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── FLOW 2 COLONNE ──────────────────────────────────────────────── */}
      {tipoSollevatore === '2_colonne' && step === 0 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-1">Tipo di Pavimentazione</h2>
          <p className="text-sm text-slate-400 mb-5">
            La pavimentazione determina la famiglia di sollevatori (con o senza pedana).
          </p>
          <div className="space-y-3">
            {FLOOR_TYPES.map(f => (
              <button
                key={f.id}
                onClick={() => handleFloor(f.id)}
                className="w-full glass glass-hover rounded-xl p-5 text-left transition-all hover:scale-[1.01]"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-white mb-1">{f.label}</div>
                    <div className="text-sm text-slate-400">{f.desc}</div>
                  </div>
                  <div className="ml-4">
                    <Badge text={f.note} color={f.color === 'blue' ? 'blue' : 'slate'} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {tipoSollevatore === '2_colonne' && step === 1 && (
        <div className="animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">Tipo di Veicolo</h2>
            <Badge
              text={pavimentazione === 'industriale' ? 'Senza Pedana' : 'Con Pedana'}
              color={pavimentazione === 'industriale' ? 'blue' : 'slate'}
            />
          </div>
          <p className="text-sm text-slate-400 mb-5">Seleziona la categoria del veicolo da sollevare.</p>
          <div className="space-y-2">
            {VEHICLE_TYPES.map(v => (
              <button
                key={v.id}
                onClick={() => handleVehicle2Col(v.id)}
                className="w-full glass glass-hover rounded-xl px-4 py-3.5 text-left flex items-center gap-4 transition-all hover:scale-[1.005]"
              >
                <span className="text-2xl w-8 text-center">{v.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{v.label}</div>
                  <div className="text-xs text-slate-400 truncate">{v.desc}</div>
                </div>
                <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tipoSollevatore === '2_colonne' && step === 2 && (
        <div className="animate-slide-up space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">Distanza Punti di Presa</h2>
              <Badge text="Bracci" color="violet" />
            </div>
            <p className="text-sm text-slate-400">
              Misura la <strong className="text-white">distanza minima</strong> tra i punti di presa del veicolo
              (sill-to-sill). Questo dato determina il modello compatibile secondo le specifiche tecniche Cascos.
            </p>
          </div>

          <div className="glass rounded-xl p-4 border border-violet-500/20">
            <div className="flex items-start gap-2">
              <Ruler size={15} className="text-violet-400 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-violet-300 mb-1">Come misurare</div>
                <div className="text-xs text-slate-400 leading-relaxed">
                  Metti il veicolo sul ponte di sollevamento. Misura la distanza orizzontale minima
                  tra i due lati del sottoscocca dove si appoggiano i bracci. Se non conosci la misura
                  esatta, usa i preset qui sotto per il tipo di veicolo selezionato.
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setUseSlider(false)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                !useSlider ? 'bg-blue-600 text-white' : 'glass text-slate-400 hover:text-white'
              }`}
            >
              Preset veicolo
            </button>
            <button
              onClick={() => setUseSlider(true)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
                useSlider ? 'bg-blue-600 text-white' : 'glass text-slate-400 hover:text-white'
              }`}
            >
              Valore preciso
            </button>
          </div>

          {!useSlider ? (
            <div className="space-y-2">
              {presetsPerVeicolo.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handlePreset(p.mm)}
                  className="w-full glass glass-hover rounded-xl px-4 py-3 text-left flex items-center gap-4 transition-all hover:scale-[1.005]"
                >
                  <span className="font-mono font-bold text-blue-400 text-sm w-20 flex-shrink-0">{p.label}</span>
                  <span className="text-sm text-slate-300 flex-1 min-w-0 truncate">{p.desc}</span>
                  <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="glass rounded-xl p-5 space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-white font-mono">{sliderVal} mm</div>
                <div className="text-xs text-slate-500 mt-1">distanza punti di presa</div>
              </div>
              <input
                type="range"
                min={597}
                max={1810}
                step={5}
                value={sliderVal}
                onChange={e => setSliderVal(parseInt(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>597 mm</span>
                <span>1810 mm</span>
              </div>
              <button
                onClick={handleSliderConfirm}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg py-3 transition-colors"
              >
                Cerca modelli per {sliderVal} mm
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── FLOW 4 COLONNE ──────────────────────────────────────────────── */}
      {tipoSollevatore === '4_colonne' && step === 0 && (
        <div className="animate-slide-up">
          <h2 className="text-xl font-bold text-white mb-1">Tipologia di Impiego</h2>
          <p className="text-sm text-slate-400 mb-5">
            A cosa deve servire principalmente il sollevatore? La scelta filtra le famiglie di prodotto.
          </p>
          <div className="space-y-3">
            {IMPIEGO_TYPES_4COL.map(t => (
              <button
                key={t.id}
                onClick={() => handleImpiego(t.id)}
                className="w-full glass glass-hover rounded-xl p-5 text-left flex items-center gap-4 transition-all hover:scale-[1.005]"
              >
                <span className="text-2xl w-8 text-center">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-base font-bold text-white mb-0.5">{t.label}</div>
                  <div className="text-xs text-slate-400">{t.desc}</div>
                </div>
                <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tipoSollevatore === '4_colonne' && step === 1 && (
        <div className="animate-slide-up">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white">Tipo di Veicolo</h2>
            <Badge
              text={IMPIEGO_TYPES_4COL.find(x => x.id === impiego)?.label || impiego}
              color="amber"
            />
          </div>
          <p className="text-sm text-slate-400 mb-5">
            Seleziona la categoria del veicolo: filtra la portata minima necessaria.
          </p>
          <div className="space-y-2">
            {VEHICLE_TYPES.map(v => (
              <button
                key={v.id}
                onClick={() => handleVehicle4Col(v.id)}
                className="w-full glass glass-hover rounded-xl px-4 py-3.5 text-left flex items-center gap-4 transition-all hover:scale-[1.005]"
              >
                <span className="text-2xl w-8 text-center">{v.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white text-sm">{v.label}</div>
                  <div className="text-xs text-slate-400 truncate">{v.desc}</div>
                </div>
                <ChevronRight size={16} className="text-slate-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── RESULTS VIEW ─────────────────────────────────────────────────────────────

function ResultsView({ mode, config, cartItems, onAddToCart, onGoToQuote, onSimulate, onBack, onReset }) {
  const { results = [], veicolo, pavimentazione, distanzaMm, impiego, tipoSollevatore } = config;
  const is4Col = tipoSollevatore === '4_colonne';
  const vehicleInfo = VEHICLE_TYPES.find(v => v.id === veicolo);
  const floorLabel  = is4Col ? null : FLOOR_TYPES.find(f => f.id === pavimentazione)?.label;
  const impiegoLabel = is4Col ? IMPIEGO_TYPES_4COL.find(t => t.id === impiego)?.label : null;

  const cartCount = cartItems.length;
  // Aggregazione per product.id: un modello è "già nel carrello" se c'è almeno una config nel carrello.
  const cartIds = new Set(cartItems.map(it => it.product.id));

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
            {mode === 'order' ? 'Risultati Ordine' : 'Risultati Preventivo'}
          </div>
          <div className="text-white font-semibold">
            {is4Col
              ? <>{vehicleInfo?.icon} {vehicleInfo?.label} · {impiegoLabel} · 4 Colonne</>
              : <>{vehicleInfo?.icon} {vehicleInfo?.label} · {distanzaMm} mm · {floorLabel}</>
            }
          </div>
        </div>
      </div>

      {cartCount > 0 && (
        <div className="glass rounded-xl p-4 border border-emerald-500/30 bg-emerald-500/5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              {mode === 'order' ? <ShoppingCart size={18} className="text-emerald-400" /> : <FileText size={18} className="text-emerald-400" />}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-emerald-300">
                {cartCount} articol{cartCount === 1 ? 'o' : 'i'} nel {mode === 'order' ? 'ordine' : 'preventivo'}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {cartItems.map(it => it.product.modello).join(', ')}
              </div>
            </div>
          </div>
          <button
            onClick={onGoToQuote}
            className="flex-shrink-0 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
          >
            Prosegui
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {results.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center space-y-3">
          <AlertCircle size={32} className="text-amber-400 mx-auto" />
          <div className="text-white font-semibold">Nessun modello compatibile</div>
          <div className="text-sm text-slate-400">
            {is4Col
              ? 'Nessun sollevatore 4 colonne Cascos copre la combinazione impiego/veicolo selezionata. Prova un altro tipo di impiego o veicolo.'
              : 'Nessun sollevatore Cascos copre la combinazione veicolo/pavimentazione/distanza selezionata. Prova a modificare la distanza.'
            }
          </div>
          <button onClick={onBack} className="glass glass-hover rounded-xl px-4 py-2 text-sm text-white transition-colors">
            {is4Col ? 'Modifica impiego' : 'Modifica distanza'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              isRecommended={i === 0}
              onSelect={onAddToCart}
              onSimulate={onSimulate}
              mode={mode}
              alreadyInCart={cartIds.has(p.id)}
            />
          ))}
        </div>
      )}

      <button
        onClick={onReset}
        className="w-full glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <RotateCcw size={14} /> Nuova Configurazione
      </button>
    </div>
  );
}

// ─── QUOTE VIEW ───────────────────────────────────────────────────────────────

function QuoteView({ mode, items, onUpdateQty, onRemoveItem, onAddMore, onBack, onReset }) {
  const [customer, setCustomer] = useState({ nome: '', azienda: '', email: '', telefono: '', indirizzo: '' });
  const [note, setNote]         = useState('');
  const [sconto, setSconto]     = useState(0);
  const [generated, setGenerated] = useState(false);
  const [copied, setCopied]     = useState(false);

  const imponibile    = items.reduce((sum, it) => sum + it.product.prezzoNetto * it.qty, 0);
  const scontoEuro    = imponibile * (sconto / 100);
  const prezzoFinale  = imponibile - scontoEuro;
  const totArticoli   = items.reduce((sum, it) => sum + it.qty, 0);
  const docType       = mode === 'order' ? 'ORDINE' : 'PREVENTIVO';

  const handleGenerate = () => setGenerated(true);

  const buildDocumentText = () => generateDocumentText({
    mode, customer, items, note, sconto, imponibile, scontoEuro, prezzoFinale
  });

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(buildDocumentText())}`, '_blank', 'noopener,noreferrer');
  };

  const handleCopyTxt = async () => {
    try {
      await navigator.clipboard.writeText(buildDocumentText());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Copia non riuscita.');
    }
  };

  const inputCls = "w-full glass rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 border border-slate-700 focus:outline-none focus:border-blue-500 transition-colors";

  // ─── DOCUMENTO GENERATO ───────────────────────────────────────────────────
  if (generated) {
    return (
      <div className="animate-fade-in space-y-5">
        {/* PRINT HEADER */}
        <div className="hidden print:block text-black">
          <div className="flex justify-between items-start border-b-2 border-gray-300 pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Cormach Srl — Cascos Lifts</h1>
              <p className="text-gray-600 text-sm">Distribuzione ufficiale Cascos in Italia</p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold">{docType} N —</div>
              <div className="text-sm text-gray-600">Data: {today()}</div>
            </div>
          </div>
        </div>

        <div className="no-print flex items-center gap-3">
          <button onClick={() => setGenerated(false)} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-wider">{docType} Generato</div>
            <div className="text-white font-semibold">
              {items.length} articol{items.length === 1 ? 'o' : 'i'} · {customer.azienda || customer.nome}
            </div>
          </div>
        </div>

        {/* DOCUMENTO */}
        <div className="glass rounded-xl overflow-hidden print:bg-white print:text-black print:rounded-none print:border-0">
          <div className="bg-slate-800 print:bg-gray-100 p-4 border-b border-slate-700 print:border-gray-300">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-xs text-slate-400 print:text-gray-500 uppercase tracking-wider">{docType}</div>
                <div className="text-white print:text-black font-bold text-lg">
                  {customer.azienda || customer.nome || '—'}
                </div>
                {customer.email && <div className="text-xs text-slate-400 print:text-gray-500">{customer.email}</div>}
                {customer.telefono && <div className="text-xs text-slate-400 print:text-gray-500">{customer.telefono}</div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 print:text-gray-500">Data</div>
                <div className="text-white print:text-black font-mono font-semibold">{today()}</div>
              </div>
            </div>
          </div>

          <div className="p-4 border-b border-slate-700 print:border-gray-300">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 print:text-gray-500 text-left">
                  <th className="pb-2">Codice</th>
                  <th className="pb-2">Descrizione</th>
                  <th className="pb-2 text-right">Q.ta</th>
                  <th className="pb-2 text-right">P.Netto</th>
                  <th className="pb-2 text-right">Totale</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const { product, config, qty } = it;
                  const vehicleInfo = VEHICLE_TYPES.find(v => v.id === config.veicolo);
                  const is4ColRow = (config.tipoSollevatore || '2_colonne') === '4_colonne';
                  const bracciInfo = is4ColRow ? null : getBracciInfo(product);
                  const floorLabelRow = is4ColRow ? null : FLOOR_TYPES.find(f => f.id === config.pavimentazione)?.label;
                  const impiegoLabelRow = is4ColRow ? IMPIEGO_TYPES_4COL.find(t => t.id === config.impiego)?.label : null;
                  const totaleRiga = product.prezzoNetto * qty;
                  return (
                    <tr key={it.id} className="align-top border-t border-slate-700/50 print:border-gray-200 first:border-0">
                      <td className="py-2 text-blue-400 print:text-blue-700 font-mono font-semibold">{product.codice}</td>
                      <td className="py-2 text-white print:text-black">
                        <div className="font-semibold">{product.modello}</div>
                        <div className="text-xs text-slate-400 print:text-gray-500">{product.portata} · {product.categoria}</div>
                        <div className="text-xs text-slate-500 print:text-gray-600">
                          {is4ColRow
                            ? <>4 Colonne · {vehicleInfo?.label} · {impiegoLabelRow}</>
                            : <>{floorLabelRow} · {vehicleInfo?.label} · {config.distanzaMm} mm</>
                          }
                        </div>
                        {bracciInfo && (
                          <div className="text-xs text-violet-400 print:text-violet-700">
                            Bracci: {bracciInfo.minMm}–{bracciInfo.maxMm} mm
                          </div>
                        )}
                      </td>
                      <td className="py-2 text-white print:text-black text-right">{qty}</td>
                      <td className="py-2 text-white print:text-black text-right font-mono">{formatPrice(product.prezzoNetto)}</td>
                      <td className="py-2 text-white print:text-black text-right font-mono font-bold">{formatPrice(totaleRiga)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 border-b border-slate-700 print:border-gray-300">
            <div className="flex flex-col items-end gap-1 text-sm">
              <div className="flex gap-6 text-slate-400 print:text-gray-500">
                <span>Imponibile ({totArticoli} art.)</span>
                <span className="font-mono">{formatPrice(imponibile)}</span>
              </div>
              {sconto > 0 && (
                <div className="flex gap-6 text-amber-400 print:text-amber-700">
                  <span>Sconto {sconto}%</span>
                  <span className="font-mono">-{formatPrice(scontoEuro)}</span>
                </div>
              )}
              <div className="flex gap-6 text-white print:text-black text-lg font-bold border-t border-slate-600 print:border-gray-300 pt-2 mt-1">
                <span>Totale Netto</span>
                <span className="font-mono text-blue-400 print:text-blue-700">{formatPrice(prezzoFinale)}</span>
              </div>
              <div className="text-xs text-slate-500 print:text-gray-500">IVA esclusa</div>
            </div>
          </div>

          {note && (
            <div className="p-4">
              <div className="text-xs text-slate-500 print:text-gray-500 uppercase tracking-wider mb-1">Note</div>
              <div className="text-sm text-slate-300 print:text-gray-700">{note}</div>
            </div>
          )}
        </div>

        {/* SCHEDE TECNICHE PDF — una per ogni prodotto con PDF disponibile */}
        {items.some(it => !!PDF_SCHEDE[it.product.codice]) && (
          <div className="no-print glass rounded-xl p-4 border border-sky-500/20 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-sky-300">
              <BookOpen size={15} />
              Schede Tecniche Ufficiali
            </div>
            <p className="text-xs text-slate-400">
              Depliant originali Cascos per ogni prodotto del {docType.toLowerCase()}. Scaricali e allegali su WhatsApp.
            </p>
            <div className="space-y-2">
              {items.filter(it => !!PDF_SCHEDE[it.product.codice]).map(it => (
                <div key={it.id} className="flex items-center justify-between gap-3 bg-slate-900/40 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm text-white truncate">{it.product.modello}</div>
                    <div className="text-xs text-slate-500 font-mono">Rif. {it.product.codice}</div>
                  </div>
                  <div className="flex-shrink-0">
                    <SchedaTecnicaButton codice={it.product.codice} modello={it.product.modello} compact />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AZIONI */}
        <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={handleWhatsApp}
            className="glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white font-medium transition-colors"
          >
            <MessageCircle size={16} /> Condividi Testo WhatsApp
          </button>
          <button
            onClick={handleCopyTxt}
            className="glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-white font-medium transition-colors"
          >
            <Copy size={16} /> {copied ? 'Copiato' : 'Copia Testo'}
          </button>
          <button
            onClick={onReset}
            className="glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <RotateCcw size={16} /> Nuovo
          </button>
        </div>
      </div>
    );
  }

  // ─── FORM PREVENTIVO ──────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg glass hover:bg-slate-700 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Dati {docType}</div>
          <div className="text-white font-semibold">
            {items.length} articol{items.length === 1 ? 'o' : 'i'} selezionat{items.length === 1 ? 'o' : 'i'}
          </div>
        </div>
      </div>

      {/* ELENCO PRODOTTI NEL CARRELLO */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-300">Articoli nel {docType.toLowerCase()}</div>
          <Badge text={`${items.length} art.`} color="blue" />
        </div>

        <div className="space-y-3">
          {items.map((it) => {
            const { product, config, qty } = it;
            const vehicleInfo = VEHICLE_TYPES.find(v => v.id === config.veicolo);
            const is4ColRow = (config.tipoSollevatore || '2_colonne') === '4_colonne';
            const bracciInfo = is4ColRow ? null : getBracciInfo(product);
            const floorLabelRow = is4ColRow ? 'Pav. Universale' : FLOOR_TYPES.find(f => f.id === config.pavimentazione)?.label;
            const floorColorRow = is4ColRow ? 'violet' : (config.pavimentazione === 'industriale' ? 'blue' : 'slate');
            const impiegoLabelRow = is4ColRow ? IMPIEGO_TYPES_4COL.find(t => t.id === config.impiego)?.label : null;
            const totaleRiga = product.prezzoNetto * qty;
            const hasPdf = !!PDF_SCHEDE[product.codice];

            return (
              <div key={it.id} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-white">{product.modello}</div>
                    <div className="font-mono text-xs text-slate-400">Rif. {product.codice}</div>
                  </div>
                  <button
                    onClick={() => onRemoveItem(it.id)}
                    title="Rimuovi articolo"
                    className="flex-shrink-0 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <Badge text={product.portata} color="green" />
                  <Badge text={floorLabelRow} color={floorColorRow} />
                  {is4ColRow
                    ? <Badge text="4 Colonne" color="violet" />
                    : (bracciInfo && <Badge text={`${config.distanzaMm} mm`} color="violet" />)
                  }
                  {is4ColRow && impiegoLabelRow && <Badge text={impiegoLabelRow} color="amber" />}
                </div>

                <div className="text-xs text-slate-500">
                  {vehicleInfo?.icon} {vehicleInfo?.label}
                  {bracciInfo && <span> · Bracci {bracciInfo.minMm}–{bracciInfo.maxMm} mm</span>}
                </div>

                {hasPdf && (
                  <SchedaTecnicaButton codice={product.codice} modello={product.modello} compact />
                )}

                <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-slate-400">Q.ta</label>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateQty(it.id, qty - 1)}
                        disabled={qty <= 1}
                        className="w-7 h-7 rounded-lg glass hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors"
                      >
                        −
                      </button>
                      <input
                        className="w-12 text-center glass rounded-lg py-1 text-sm text-white border border-slate-700 focus:outline-none focus:border-blue-500"
                        type="number"
                        min="1"
                        max="99"
                        value={qty}
                        onChange={e => onUpdateQty(it.id, Math.max(1, parseInt(e.target.value) || 1))}
                      />
                      <button
                        onClick={() => onUpdateQty(it.id, qty + 1)}
                        className="w-7 h-7 rounded-lg glass hover:bg-slate-700 text-white text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">{formatPrice(product.prezzoNetto)} x {qty}</div>
                    <div className="text-sm font-bold text-blue-400 font-mono">{formatPrice(totaleRiga)}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={onAddMore}
          className="w-full glass glass-hover rounded-xl py-3 flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors border border-dashed border-blue-500/30"
        >
          <Plus size={16} /> Aggiungi un altro prodotto
        </button>
      </div>

      {/* DATI CLIENTE */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-300 mb-1">Dati Cliente</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Nome / Ragione Sociale *" value={customer.nome} onChange={e => setCustomer(s => ({...s, nome: e.target.value}))} />
          <input className={inputCls} placeholder="Azienda" value={customer.azienda} onChange={e => setCustomer(s => ({...s, azienda: e.target.value}))} />
          <input className={inputCls} placeholder="Email" type="email" value={customer.email} onChange={e => setCustomer(s => ({...s, email: e.target.value}))} />
          <input className={inputCls} placeholder="Telefono" type="tel" value={customer.telefono} onChange={e => setCustomer(s => ({...s, telefono: e.target.value}))} />
        </div>
        <input className={inputCls} placeholder="Indirizzo di consegna" value={customer.indirizzo} onChange={e => setCustomer(s => ({...s, indirizzo: e.target.value}))} />
      </div>

      {/* DETTAGLI PREVENTIVO / ORDINE */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="text-sm font-semibold text-slate-300 mb-1">Dettagli {docType}</div>
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Sconto globale % (opzionale)</label>
          <input
            className={inputCls}
            type="number"
            min="0"
            max="50"
            placeholder="0"
            value={sconto || ''}
            onChange={e => setSconto(Math.min(50, Math.max(0, parseFloat(e.target.value) || 0)))}
          />
          <p className="text-xs text-slate-500 mt-1">Si applica al totale di tutti gli articoli</p>
        </div>
        <textarea
          className={`${inputCls} resize-none h-20`}
          placeholder="Note aggiuntive, condizioni speciali..."
          value={note}
          onChange={e => setNote(e.target.value)}
        />
      </div>

      {/* TOTALI */}
      <div className="glass rounded-xl p-4">
        <div className="flex justify-between items-center text-sm text-slate-400 mb-1">
          <span>{totArticoli} articol{totArticoli === 1 ? 'o' : 'i'} · imponibile</span>
          <span>{formatPrice(imponibile)}</span>
        </div>
        {sconto > 0 && (
          <div className="flex justify-between items-center text-sm text-amber-400 mb-1">
            <span>Sconto {sconto}%</span>
            <span>-{formatPrice(scontoEuro)}</span>
          </div>
        )}
        <div className="flex justify-between items-center text-lg font-bold text-white border-t border-slate-700 pt-2">
          <span>Totale Netto</span>
          <span className="text-blue-400">{formatPrice(prezzoFinale)}</span>
        </div>
        <div className="text-xs text-slate-500 text-right mt-0.5">IVA esclusa</div>
      </div>

      <button
        onClick={handleGenerate}
        disabled={!customer.nome || items.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-colors"
      >
        {mode === 'order' ? <ShoppingCart size={18} /> : <FileText size={18} />}
        Genera {docType}
        <ChevronRight size={18} />
      </button>

      {!customer.nome && (
        <p className="text-xs text-slate-500 text-center">* Inserisci almeno il nome cliente per procedere</p>
      )}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const { products, importFromExcel, listinoInfo, resetPrices } = useProducts();
  const updateAvailable = useAppUpdate();
  const [view, setView]                   = useState('dashboard');
  const [mode, setMode]                   = useState('quote');
  const [config, setConfig]               = useState(null);
  const [cartItems, setCartItems]         = useState([]);
  const [importStatus, setImportStatus]   = useState(null);
  const [simTarget, setSimTarget]         = useState(null); // { liftId, vehId } per il simulatore

  const handleStart          = (m) => {
    setMode(m);
    setCartItems([]);
    setConfig(null);
    setView('configurator');
  };
  const handleConfigResult   = (cfg) => { setConfig(cfg); setView('results'); };

  // Aggiunge il prodotto al carrello con la configurazione corrente.
  // Se lo stesso prodotto con la stessa configurazione c'e' gia', incrementa la quantita'.
  // Un prodotto 2col e lo stesso prodotto 4col (o con impiego diverso) sono righe separate.
  const handleAddToCart = (product) => {
    setCartItems(items => {
      const existingIdx = items.findIndex(it => {
        if (it.product.id !== product.id) return false;
        // Deve matchare il tipo di sollevatore
        const itTipo = it.config.tipoSollevatore || '2_colonne';
        const cfgTipo = config.tipoSollevatore || '2_colonne';
        if (itTipo !== cfgTipo) return false;
        if (cfgTipo === '4_colonne') {
          return it.config.impiego === config.impiego &&
                 it.config.veicolo === config.veicolo;
        }
        return it.config.pavimentazione === config.pavimentazione &&
               it.config.veicolo        === config.veicolo &&
               it.config.distanzaMm     === config.distanzaMm;
      });
      if (existingIdx >= 0) {
        const updated = [...items];
        updated[existingIdx] = { ...updated[existingIdx], qty: updated[existingIdx].qty + 1 };
        return updated;
      }
      return [...items, {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        product,
        config,
        qty: 1,
      }];
    });
  };

  const handleUpdateQty = (itemId, newQty) => {
    setCartItems(items => items.map(it =>
      it.id === itemId ? { ...it, qty: Math.max(1, Math.min(99, newQty)) } : it
    ));
  };

  const handleRemoveItem = (itemId) => {
    setCartItems(items => {
      const updated = items.filter(it => it.id !== itemId);
      // Se il carrello si svuota mentre si e' nella QuoteView, torna ai risultati
      if (updated.length === 0 && view === 'quote') {
        setView(config ? 'results' : 'configurator');
      }
      return updated;
    });
  };

  const handleGoToQuote = () => setView('quote');

  // Apre il simulatore precompilato sul modello scelto, nella modalità giusta
  // (2 colonne = bracci, 4 colonne = drive-on), con il veicolo della config corrente.
  const handleSimulate = (product) => {
    setSimTarget({
      liftId: product.id,
      vehId: config?.veicolo || null,
      mode: product.tipo_sollevatore === '4_colonne' ? '4col' : '2col',
    });
    setView('simulator');
  };

  // Torna al configuratore per aggiungere un altro prodotto (config pulita)
  const handleAddMore = () => {
    setConfig(null);
    setView('configurator');
  };

  const handleReset = () => {
    setView('dashboard');
    setConfig(null);
    setCartItems([]);
  };

  const handleImport = async (file) => {
    try {
      const count = await importFromExcel(file);
      setImportStatus(`${count} prodotti aggiornati`);
    } catch {
      setImportStatus('Errore import — verifica formato');
    }
  };

  const handleResetPrices = () => {
    resetPrices();
    setImportStatus(null);
  };

  return (
    <div className="min-h-screen bg-navy-900">
      {/* ─── BANNER AGGIORNAMENTO ─────────────────────────────────────────── */}
      {updateAvailable && (
        <div className="fixed top-0 left-0 right-0 z-50 no-print">
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between max-w-lg mx-auto">
            <div className="flex items-center gap-2 text-sm">
              <span className="animate-pulse">●</span>
              <span className="font-medium">Nuova versione disponibile</span>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-xs font-bold bg-white text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors flex-shrink-0 ml-3"
            >
              Aggiorna ora
            </button>
          </div>
        </div>
      )}

      <header className={`sticky z-40 glass border-b border-slate-800/60 no-print ${updateAvailable ? 'top-12' : 'top-0'}`}>
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <button
              onClick={() => { setSimTarget(null); setView('simulator'); }}
              className="flex items-center gap-1.5 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
              title="Simulatore geometrico bracci (2 colonne)"
            >
              <Activity size={13} /> Sim
            </button>
            {/* Indicatore carrello nell'header quando fuori dalla QuoteView */}
            {cartItems.length > 0 && view !== 'quote' && (
              <button
                onClick={handleGoToQuote}
                className="relative flex items-center gap-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
                title="Vai al preventivo"
              >
                {mode === 'order' ? <ShoppingCart size={13} /> : <FileText size={13} />}
                <span>{cartItems.length}</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              <RotateCcw size={13} /> Reset
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-20">
        {view === 'dashboard' && (
          <DashboardView
            onStart={handleStart}
            onImport={handleImport}
            importStatus={importStatus}
            listinoInfo={listinoInfo}
            onResetPrices={handleResetPrices}
          />
        )}
        {view === 'simulator' && (
          <Simulator
            products={products}
            initialLiftId={simTarget?.liftId || null}
            initialVehId={simTarget?.vehId || null}
            initialMode={simTarget?.mode || '2col'}
            onBack={() => { setView(config ? 'results' : 'dashboard'); setSimTarget(null); }}
          />
        )}
        {view === 'configurator' && (
          <ConfiguratorView
            mode={mode}
            products={products}
            onResult={handleConfigResult}
            onBack={() => cartItems.length > 0 ? setView('quote') : setView('dashboard')}
          />
        )}
        {view === 'results' && config && (
          <ResultsView
            mode={mode}
            config={config}
            cartItems={cartItems}
            onAddToCart={handleAddToCart}
            onGoToQuote={handleGoToQuote}
            onSimulate={handleSimulate}
            onBack={() => setView('configurator')}
            onReset={handleReset}
          />
        )}
        {view === 'quote' && cartItems.length > 0 && (
          <QuoteView
            mode={mode}
            items={cartItems}
            onUpdateQty={handleUpdateQty}
            onRemoveItem={handleRemoveItem}
            onAddMore={handleAddMore}
            onBack={() => config ? setView('results') : setView('configurator')}
            onReset={handleReset}
          />
        )}
      </main>
    </div>
  );
}
