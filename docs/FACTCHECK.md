# FACTCHECK — Verifica di tutte le misure dei sollevatori

> Obiettivo: garantire che **ogni quota mostrata dal simulatore** corrisponda ai
> dati ufficiali Cascos (schede PDF in `public/`). Oggi alcune misure del
> simulatore sono **template** (segnaposto) e vanno sostituite con i valori veri.

## Perché serve (il caso che ha fatto partire tutto)

Nel simulatore, per il **C3.5S**, la quota "ATTACCHI BRACCI" mostrava **500 mm**:
era il valore template di default (`DEFAULT_ARM_MOUNT_MM = 500` in `geometry.js`).
La scheda ufficiale (cod. 13169, `cascos senza pedana.pdf`, p.7) riporta **620 mm**
nel disegno in pianta dei bracci. → Corretto con un override `c35s: { armMountDistanceMm: 620 }`.
Lo stesso tipo di verifica va fatto su **tutti** i modelli.

## Cosa è già automatico e cosa no

- **Estraibile dal testo del PDF (affidabile)**: interno colonne ("portale"),
  H.min, H.max. Già bootstrappati in `src/data/factcheck.json` (campo `pdf_auto`).
- **Da leggere VISIVAMENTE (il testo esce mangiato)**: range bracci (es. 690→1325),
  distanza attacchi bracci (la quota tipo "620"), e il rientro perni. Sono etichette
  ruotate/grafiche nel catalogo: vanno lette aprendo la pagina renderizzata.

## File coinvolti

- `src/data/factcheck.json` — **la checklist**: una voce per modello con i valori
  attuali del simulatore, i candidati auto-estratti, l'elenco dei campi da
  verificare, lo slot `verificato:{}` e lo `status`.
- `src/data/geometry.js` — `GEOMETRY_OVERRIDES`: qui finiscono i valori **verificati**.
- `scripts/factcheck.mjs` — genera le immagini delle pagine catalogo da ispezionare.

## Procedura (per ogni modello con `status: "todo"`)

1. **Genera il materiale visivo**:
   ```bash
   node scripts/factcheck.mjs 13169      # un codice
   node scripts/factcheck.mjs            # tutti
   ```
   Produce `factcheck/<codice>/page-N.png` + `text.txt`.

2. **Apri il PNG e leggi le quote reali**:
   - interno colonne (portale), es. 2700 / 3000 / 2810…
   - corsa bracci: valore minimo e massimo (es. 690 → 1325)
   - **distanza attacchi bracci** = la quota verticale nel disegno in pianta (es. 620)
   - H.min / H.max
   - se ricavabile, il rientro del perno braccio rispetto alla colonna

3. **Confronta con `simulatore` nella voce di `factcheck.json`** e registra i valori
   reali in `verificato`. Esempio già fatto (C3.5S):
   ```json
   "verificato": { "armMountDistanceMm": 620 },
   "status": "verificato"
   ```

4. **Applica i valori in `geometry.js` → `GEOMETRY_OVERRIDES`**, chiave = `id` del prodotto:
   ```js
   c35s: { armMountDistanceMm: 620 },
   // aggiungi gli altri campi se diversi dal parsing: internalColumnDistanceMm,
   // columnOffsetMm, frontArm, rearArm
   ```

5. **Segna eventuali errori di `products.json`**: se l'interno colonne (o un altro
   dato) nel `noteTecniche` differisce dal PDF, correggilo in `products.json` e
   annotalo nella voce (`note`). Discrepanza già rilevata in automatico:
   **C5 Wagon (13176)** → PDF 2810 vs note 3000: da verificare quale è corretto.

6. **Verifica nel simulatore**: avvia `npm run dev`, apri il modello e controlla che
   la quota "ATTACCHI BRACCI" e i numeri dei bracci coincidano con la scheda; che
   l'avviso "valori template" sparisca quando tutti i campi sono verificati
   (`geom.template` diventa `false` quando gli override coprono i campi template).

## Definizione di "fatto"

- Tutte le voci 2 colonne in `factcheck.json` hanno `status: "verificato"`.
- `GEOMETRY_OVERRIDES` contiene i valori reali per ogni modello 2 colonne.
- Nessun avviso "template" residuo nel simulatore per i 2 colonne.
- Le discrepanze su `products.json` sono corrette o annotate.
- I 4 colonne restano fuori dal modello a bracci (vedi F5 in `docs/SIMULATOR_SPEC.md`):
  per loro va verificato il set drive-on (lunghezza pedane, runway, interasse, portata).

## Suggerimento operativo

Procedi a piccoli lotti (es. famiglia C3.x, poi C4.x, poi C5.x), facendo `npm run build`
e un controllo visivo dopo ogni lotto, così un eventuale errore si individua subito.
