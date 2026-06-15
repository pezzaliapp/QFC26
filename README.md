# QFC26 — Simulatore & Preventivi Cascos

PWA professionale (React 18 + Vite 5 + Tailwind) per **configurare, simulare e
preventivare** i sollevatori **Cascos** a 2 e 4 colonne. Funziona offline,
installabile su smartphone e desktop.

Evoluzione di `quoteflow-cascosR0426`, con in più il **simulatore geometrico dei
bracci** (porting della logica dinamica di **LiftPointDB v15**) applicato ai
modelli Cascos a 2 colonne.

## Cosa fa il simulatore

Modella il ponte come 4 perni braccio (2 per colonna), ognuno con corsa MIN..MAX.
Dato un veicolo (punti di presa) e uno spostamento longitudinale, per ogni braccio
calcola la distanza richiesta e verifica `MIN ≤ richiesto ≤ MAX` più la portata.
Include solver "trova posizione valida", disegno SVG dello schema operativo e
pannello logica di calcolo. Geometrie ricavate automaticamente dalle note tecniche
di `products.json` (interno colonne, range bracci, H.min/max).

## Stack

- React 18 + Vite 5 + Tailwind CSS
- vite-plugin-pwa (service worker + manifest)
- xlsx (import listino Excel)
- Motore simulatore: JavaScript puro (`src/engine/simulator.js`)

## Setup

```bash
npm install
npm run dev      # sviluppo locale
npm run build    # build produzione
```

## Struttura

- `src/App.jsx` — app (dashboard, configuratore, risultati, preventivo) + vista simulatore
- `src/engine/simulator.js` — motore geometrico puro
- `src/data/geometry.js` — geometrie dai prodotti + template veicoli
- `src/components/Simulator.jsx` — UI del simulatore (controlli + SVG)
- `CLAUDE.md` — guida operativa per lavorare in autonomia con Claude Code
- `docs/SIMULATOR_SPEC.md` — specifica del porting + roadmap a fasi

## Listino prezzi

I prezzi NON sono nel repository (riservatezza). Si caricano dal file Excel nella
dashboard e restano nel localStorage del browser. Colonne attese: "Riferimento" e
"Netto Riv. (€)".

## Note dati

Le geometrie estratte dalle note tecniche sono reali; rientro perni, distanza
attacchi bracci e punti di presa dei veicoli sono **template** marcati, da
sostituire con i dati ufficiali (vedi `GEOMETRY_OVERRIDES` e `VEHICLE_TEMPLATES`).
Il simulatore è uno strumento di supporto: la verifica fisica in officina resta
obbligatoria.

## Licenza

Uso interno Cormach Srl / PezzaliApp. Non distribuire senza autorizzazione.
