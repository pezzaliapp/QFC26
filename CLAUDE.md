# CLAUDE.md — Guida operativa QFC26

> Questo file è la "mappa" per lavorare in autonomia su QFC26 con Claude Code.
> Leggilo prima di toccare il codice. Aggiornalo quando completi una fase.

## Cos'è QFC26

PWA (React 18 + Vite 5 + Tailwind) per **configurare, simulare e preventivare**
i sollevatori **Cascos** (2 e 4 colonne). Evoluzione di `quoteflow-cascosR0426`
con l'aggiunta del **simulatore geometrico** ispirato a LiftPointDB v15.

Uso interno Cormach Srl / PezzaliApp. I prezzi non sono nel repo (import Excel
lato client, salvati in localStorage).

## Comandi

```bash
npm install        # dipendenze
npm run dev        # sviluppo locale (http://localhost:5173)
npm run build      # build produzione in dist/
npm run preview    # anteprima della build
```

Deploy automatico su GitHub Pages via `.github/workflows/deploy.yml` ad ogni push su `main`.

## Mappa del progetto

```
src/
  App.jsx                 # tutta l'app (dashboard, configuratore, risultati, preventivo)
  main.jsx                # bootstrap React
  index.css               # tema (glass, navy, gradient) + print
  data/
    products.json         # 35 sollevatori Cascos (19×2col, 16×4col)
    rules.js              # tipi veicolo, filtri compatibilità, motivazioni
    geometry.js           # [NUOVO] geometrie per il simulatore + template veicoli
  engine/
    simulator.js          # [NUOVO] motore geometrico puro (no React)
  components/
    Simulator.jsx         # [NUOVO] vista simulatore (controlli + disegno SVG)
docs/
  SIMULATOR_SPEC.md       # specifica tecnica del porting + roadmap a fasi
```

## Stato attuale (cosa è già fatto)

- [x] Motore geometrico portato da LiftPointDB (`engine/simulator.js`): `getPivots`,
      `calcArms`, `evaluate`, `findBestOffset`, `validOffsetWindow`.
- [x] Layer geometrie (`data/geometry.js`): parser di `noteTecniche` che ricava
      interno colonne, range bracci e H.min/H.max per **tutti i 19 modelli a 2 colonne**;
      template veicoli con punti di presa.
- [x] Componente `Simulator.jsx` con selettori ponte/configurazione/veicolo, slider
      posizione, solver "trova posizione valida", tabella esiti e disegno SVG.
- [x] Integrazione in `App.jsx`: pulsante **Sim** nell'header + `view === 'simulator'`.
- [x] Build di produzione verde.

## Cosa NON rompere

- Il flusso preventivi esistente (`dashboard → configurator → results → quote`)
  deve continuare a funzionare. Il simulatore è additivo.
- Import listino Excel e persistenza localStorage.
- La PWA (service worker + manifest): non rimuovere `vite-plugin-pwa`.
- `products.json` è la fonte unica dei modelli: arricchiscilo, non duplicarlo.

## Convenzioni

- Tutto in **millimetri**, sistema cartesiano centrato sul ponte
  (x trasversale, y longitudinale; vedi commenti in `engine/simulator.js`).
- Logica di calcolo **pura e testabile** in `engine/`; React solo in `components/`.
- Dati "veri" (ricavati dai manuali/note) vs dati **template** vanno sempre marcati
  (`template: true`) e segnalati in UI, come fa LiftPointDB con i dati veicolo.
- Tema: usa le classi/utility già presenti (`glass`, `navy-*`, `accent-light`,
  `text-amber-400`); non introdurre nuove palette.

## Roadmap autonoma (prossime fasi)

Esegui in ordine; spunta man mano. Dettagli tecnici in `docs/SIMULATOR_SPEC.md`.

- [ ] **F1 — Fact-check di TUTTE le misure** (priorità attuale): verifica ogni quota
      del simulatore contro le schede ufficiali in `public/`. Procedura completa in
      `docs/FACTCHECK.md`; checklist in `src/data/factcheck.json`; helper
      `scripts/factcheck.mjs` (rende le pagine catalogo in PNG da leggere).
      Esempio già fatto: `c35s: { armMountDistanceMm: 620 }` in `GEOMETRY_OVERRIDES`.
      Discrepanza rilevata da chiudere: C5 Wagon (interno colonne 2810 vs 3000).
- [ ] **F2 — Punti presa veicolo reali**: sostituisci i `VEHICLE_TEMPLATES` con
      profili reali per i veicoli più trattati, o consenti input manuale del passo/carreggiata.
- [ ] **F3 — Ponte dal preventivo**: apri il simulatore precompilato sul modello
      selezionato nel configuratore/carrello (passa `liftId` come prop iniziale).
- [ ] **F4 — Esito → preventivo**: bottone "Aggiungi a preventivo" dal simulatore,
      salvando nel `config` dell'item la posizione/validità calcolata.
- [ ] **F5 — Estensione 4 colonne**: modello "drive-on" (lunghezza pedane vs passo,
      larghezza runway) come seconda modalità del simulatore.
- [ ] **F6 — Multi-configurazione**: per le famiglie che lo prevedono, aggiungi
      configurazioni alternative (es. simmetrica/asimmetrica) come AL55 in LiftPointDB.
- [ ] **F7 — Test**: aggiungi test unitari sul motore (vitest) e un fixture di
      validazione per ogni famiglia.

## Note

- Riferimento concettuale: LiftPointDB v15 (simulatore AL40/ALB40/AL55, configurazioni
  simmetrica/asimmetrica). La stessa logica perno→braccio→punto presa è qui applicata
  ai Cascos a 2 colonne.
- Verifica sempre fisicamente in officina: il simulatore è uno strumento di supporto
  alla vendita, non sostituisce le istruzioni del costruttore.
