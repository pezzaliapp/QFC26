# SIMULATOR_SPEC — Porting LiftPointDB → QFC26 (Cascos)

Specifica tecnica del simulatore geometrico. Riferimento sorgente: **LiftPointDB v15**.

## 1. Idea

LiftPointDB simula un ponte a 2 colonne come 4 **perni braccio** (2 per colonna:
anteriore/posteriore). Ogni braccio ha una corsa `MIN..MAX`. Dato un **veicolo**
con 4 **punti di presa** e uno **spostamento longitudinale** (offset), per ciascun
braccio si calcola la distanza perno→punto di presa e si verifica che rientri nel
range del braccio. Più il check di **portata** (peso veicolo ≤ portata ponte).

In QFC26 lo stesso modello è applicato ai sollevatori **Cascos a 2 colonne**.

## 2. Mappatura dati LiftPointDB → Cascos

| LiftPointDB (lift)            | QFC26 (geometry.js → toGeometry)         | Fonte                           |
|-------------------------------|------------------------------------------|---------------------------------|
| `internalColumnDistanceMm`    | `internalColumnDistanceMm`               | parse "Larghezza portale … mm"  |
| `frontArm/rearArm {min,max}`  | `frontArm/rearArm`                        | parse range "a→b mm"            |
| `minPadHeightMm/maxLiftHeightMm` | idem                                  | parse "H.Min/H.Max … mm"        |
| `capacityKg`                  | `capacityKg`                              | `product.portataKg`             |
| `columnOffsetMm` (rientro)    | `columnOffsetMm`                          | **TEMPLATE** (default 120)      |
| `armMountDistanceMm`          | `armMountDistanceMm`                      | **TEMPLATE** (default 500)      |
| `configurations[]`            | `configurations[]` (oggi solo `standard`)| derivata                        |

Veicoli: LiftPointDB ha `vehicles[].liftPoints`. Qui `VEHICLE_TEMPLATES` +
`vehicleLiftPoints()` generano i 4 punti da `halfTrackMm`/`halfBaseMm`
(**TEMPLATE** — vedi F2).

## 3. API del motore (`engine/simulator.js`)

Funzioni pure, nessuna dipendenza da React:

- `getPivots(geom, cfg)` → `{frontLeft, frontRight, rearLeft, rearRight}` con `{x,y,arm,label}`.
- `calcArms(geom, cfg, vehicle, offset)` → array per braccio:
  `{key,label,pivot,target,arm,required,ok,minPoint,maxPoint}`.
- `evaluate(geom, cfg, vehicle, offset)` → `{arms, capacityOk, armsOk, valid, mountDistance}`.
- `findBestOffset(geom, cfg, vehicle, {min,max,step})` → primo offset valido o `null`.
- `validOffsetWindow(...)` → `{min,max}` degli offset validi o `null`.

Convenzione assi: `x` trasversale (− SX, + DX), `y` longitudinale (− anteriore, + posteriore).
Tutto in mm.

## 4. Componente (`components/Simulator.jsx`)

Props: `{ products, onBack, initialLiftId? }`.
- Costruisce le geometrie con `buildGeometries(products)` (solo 2 colonne).
- Selettori: ponte → configurazione → veicolo; slider offset; pulsanti
  *Trova posizione valida / Preset / Centra*.
- Render: metriche, esito (badge + tabella per-braccio), disegno SVG, logica calcolo.
- Disegno SVG = port 1:1 di `draw()` di LiftPointDB (colonne, veicolo, bracci
  min/max/target, quote attacchi e interno colonne).

## 5. Roadmap a fasi (dettaglio)

### F1 — Dati reali geometria
Compilare `GEOMETRY_OVERRIDES` in `geometry.js` con, per famiglia/modello:
`columnOffsetMm` (rientro perno dalla colonna) e `armMountDistanceMm` (interasse
attacchi bracci sulla stessa colonna). Fonte: manuali/schede Cascos (i PDF sono
in `public/`). Finché mancano, `template:true` e l'avviso resta visibile in UI.

### F2 — Punti presa veicolo reali
Due opzioni (anche combinabili):
1. Profili reali per i modelli veicolo più ricorrenti.
2. Input manuale di passo presa e carreggiata presa (mm) nel pannello veicolo,
   con i template come default.

### F3 — Apertura dal preventivo
In `App.jsx`, quando si seleziona un modello a 2 colonne in `ResultsView`/carrello,
offrire "Simula" che apre `<Simulator initialLiftId={product.id} />`.

### F4 — Esito → preventivo
Aggiungere in `Simulator.jsx` un bottone "Aggiungi a preventivo" che chiama
`onAddToCart(product)` con un `config` arricchito: `{ offset, valid, vehicleId }`.
Mostrare in `QuoteView` la posizione/validità calcolata.

### F5 — Estensione 4 colonne (modello drive-on)
I 4 colonne NON usano i bracci: il veicolo sale su pedane piane. Modello diverso:
- geometria: lunghezza pedana, larghezza/interasse runway, distanza colonne;
- check: passo veicolo entro la pedana, carreggiata entro la runway, portata.
Implementare come seconda **modalità** del simulatore (toggle 2col/4col), con un
secondo set di funzioni in `engine/` (es. `evaluateDriveOn`).

### F6 — Multi-configurazione
Come AL55 (simmetrica/asimmetrica) in LiftPointDB: aggiungere a `configurations[]`
varianti che cambiano `frontPivotYmm/rearPivotYmm` e `vehicleShiftPresetMm`, dove
i modelli Cascos lo prevedono.

### F7 — Test
`vitest` sul motore: per ogni famiglia, un caso noto valido e uno non valido;
verifica che `parseNote` estragga i valori attesi; regressione su `findBestOffset`.

## 6. Validazione già eseguita

- `buildGeometries` produce 19 geometrie (tutti i 2 colonne).
- Parsing verificato (es. C3.2 Confort → bracci tripli 597–1122 + doppi 710–1050).
- `evaluate` + `findBestOffset` testati (C4 + SUV → posizione valida trovata).
- `npm run build` verde con il simulatore integrato.
