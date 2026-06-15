// ============================================================================
// QFC26 · Motore "drive-on" del simulatore (sollevatori a 4 colonne)
// ----------------------------------------------------------------------------
// Modello DIVERSO dai 2 colonne: il veicolo sale con le 4 ruote su due pedane
// piane (runway). Niente bracci, niente punti di presa: contano passo,
// carreggiata, ingombro e peso del veicolo rispetto alle pedane.
//
// Funzioni PURE (nessuna dipendenza da React). Tutto in millimetri.
//   x = trasversale (− SX, + DX)   ·   y = longitudinale (− anteriore, + posteriore)
//
// Geometria pedane (geometry.js → toDriveOnGeometry):
//   runwayLengthMm                 lunghezza utile della pedana
//   runwayWidthMm                  larghezza di UNA pedana
//   runwayClearanceMm {minMm,maxMm} luce interna fra le due pedane (regolabile)
//   capacityKg                     portata del ponte
//
// La ruota a distanza track/2 dall'asse deve poggiare su una pedana: il bordo
// interno pedana sta a clearance/2, quello esterno a clearance/2 + width. Poiché
// la luce è regolabile, la carreggiata ammessa è [clearanceMin, clearanceMax + 2·width].
//
// MARGINE DI SICUREZZA: la ruota non deve appoggiare sul bordo netto della pedana,
// ma con un rientro minimo (SAFETY_EDGE_INSET_MM) da entrambi i bordi. La banda
// "sicura" della carreggiata si stringe quindi di 2·inset per lato.
// ============================================================================

/**
 * Rientro minimo (mm) della ruota dal bordo della pedana per considerarla "in
 * appoggio sicuro". Configurabile: passare {edgeInsetMm} a evaluateDriveOn per
 * sovrascriverlo (es. esigenze di flotta/pneumatici larghi).
 */
export const SAFETY_EDGE_INSET_MM = 35;

/** Ricava passo/carreggiata da un veicolo (template VEHICLE_TEMPLATES o profilo). */
export function vehicleDriveOnDims(vehicle = {}) {
  const trackMm = vehicle.trackMm
    ?? (vehicle.halfTrackMm != null ? vehicle.halfTrackMm * 2 : null);
  const wheelbaseMm = vehicle.wheelbaseMm
    ?? (vehicle.halfBaseMm != null ? vehicle.halfBaseMm * 2 : null);
  return {
    trackMm,
    wheelbaseMm,
    lengthMm: vehicle.lengthMm ?? null,
    widthMm: vehicle.widthMm ?? null,
    weightKg: vehicle.weightKg ?? null,
  };
}

/**
 * Posizione di una pedana (lato DX) data una luce interna `clearance`.
 * @returns {{innerMm:number, outerMm:number, centerMm:number}}
 */
export function runwaySpan(geom, clearanceMm) {
  const inner = clearanceMm / 2;
  const outer = inner + geom.runwayWidthMm;
  return { innerMm: inner, outerMm: outer, centerMm: (inner + outer) / 2 };
}

/**
 * Verifica se una ruota a |x| poggia su una pedana, per la luce interna data.
 * (Vale per la pedana DX con |x|>0 e, per simmetria, per la SX.)
 */
export function wheelOnRunway(geom, clearanceMm, wheelXabs, wheelYabs = 0) {
  const { innerMm, outerMm } = runwaySpan(geom, clearanceMm);
  const onX = wheelXabs >= innerMm && wheelXabs <= outerMm;
  const onY = geom.runwayLengthMm == null ? true : wheelYabs <= geom.runwayLengthMm / 2 + 1e-6;
  return onX && onY;
}

/**
 * Stato di appoggio di una ruota considerando il margine di sicurezza dai bordi:
 *   'safe'  = poggia con rientro ≥ inset da entrambi i bordi
 *   'limit' = poggia ma a meno di inset da un bordo (al limite)
 *   'off'   = fuori dalla pedana (longitudinalmente o trasversalmente)
 * @returns {{state:'safe'|'limit'|'off', edgeMarginMm:number}} edgeMarginMm = rientro
 *          minimo dai bordi trasversali (negativo se la ruota è oltre il bordo).
 */
export function wheelStatus(geom, clearanceMm, wheelXabs, wheelYabs = 0, edgeInsetMm = SAFETY_EDGE_INSET_MM) {
  const { innerMm, outerMm } = runwaySpan(geom, clearanceMm);
  const distInner = wheelXabs - innerMm;        // rientro dal bordo interno
  const distOuter = outerMm - wheelXabs;        // rientro dal bordo esterno
  const edgeMarginMm = Math.round(Math.min(distInner, distOuter));
  const onY = geom.runwayLengthMm == null ? true : wheelYabs <= geom.runwayLengthMm / 2 + 1e-6;
  if (!onY || distInner < 0 || distOuter < 0) return { state: 'off', edgeMarginMm };
  return { state: edgeMarginMm >= edgeInsetMm ? 'safe' : 'limit', edgeMarginMm };
}

/**
 * Valutazione completa drive-on: validità per asse (longitudinale, trasversale,
 * portata) + esito complessivo. Stessa forma logica di evaluate() dei 2 colonne.
 *
 * @param {object} geom     geometria 4 colonne (toDriveOnGeometry)
 * @param {object} vehicle  veicolo (template con halfTrackMm/halfBaseMm o profilo)
 * @returns {{longitudinal,transversal,capacity,valid}}
 */
export function evaluateDriveOn(geom, vehicle, { edgeInsetMm = SAFETY_EDGE_INSET_MM } = {}) {
  const v = vehicleDriveOnDims(vehicle);
  const L = geom.runwayLengthMm;
  const w = geom.runwayWidthMm;
  const c = geom.runwayClearanceMm;

  // ── Longitudinale: il passo deve stare entro la lunghezza pedana ───────────
  const passoOk = v.wheelbaseMm != null && L != null ? v.wheelbaseMm <= L : false;
  const marginMm = (L != null && v.wheelbaseMm != null) ? Math.round(L - v.wheelbaseMm) : null;
  // Sbalzo carrozzeria oltre l'asse ruota (info): a passo centrato la carrozzeria
  // sporge oltre la ruota di (lunghezza − passo)/2 per lato; "sborda" la pedana se
  // questo sbalzo supera il margine residuo (L − passo)/2 disponibile a ciascun capo.
  const bodyOverhangMm = (v.lengthMm != null && v.wheelbaseMm != null)
    ? Math.max(0, Math.round((v.lengthMm - v.wheelbaseMm) / 2)) : null;
  const runwaySpareMm = marginMm != null ? Math.round(marginMm / 2) : null;
  const sbordaPedana = (bodyOverhangMm != null && runwaySpareMm != null)
    ? bodyOverhangMm > runwaySpareMm : false; // solo informativo

  // ── Trasversale: la ruota a track/2 deve poggiare su una pedana, con rientro ─
  // minimo `edgeInsetMm` dai bordi (margine di sicurezza).
  let trackMinMm = null, trackMaxMm = null, trackRawMinMm = null, trackRawMaxMm = null;
  let recommendedClearanceMm = null, edgeMarginMm = null;
  let carreggiataOk = false, atLimit = false;
  if (w != null && c != null && v.trackMm != null) {
    // Regolazione consigliata: ruota centrata sulla pedana → luce = track − width,
    // limitata al range regolabile reale (massimizza il rientro dai bordi).
    recommendedClearanceMm = Math.min(c.maxMm, Math.max(c.minMm, Math.round(v.trackMm - w)));
    // Stato della ruota a questa regolazione (per simmetria vale per tutte e 4).
    const st = wheelStatus(geom, recommendedClearanceMm, v.trackMm / 2, 0, edgeInsetMm);
    edgeMarginMm = st.edgeMarginMm;
    carreggiataOk = st.state === 'safe';
    atLimit = st.state === 'limit';
    // Banda carreggiata SICURA (con rientro) e banda grezza (appoggio netto).
    trackMinMm = c.minMm + 2 * edgeInsetMm;
    trackMaxMm = c.maxMm + 2 * w - 2 * edgeInsetMm;
    trackRawMinMm = c.minMm;
    trackRawMaxMm = c.maxMm + 2 * w;
  }

  // ── Portata ────────────────────────────────────────────────────────────────
  const capacityOk = v.weightKg != null && geom.capacityKg != null
    ? v.weightKg <= geom.capacityKg : false;

  const valid = passoOk && carreggiataOk && capacityOk;
  // "Al limite": geometricamente appoggia ma con rientro insufficiente, e gli
  // altri assi sono OK → caso borderline da verificare fisicamente.
  const atLimitOnly = passoOk && capacityOk && atLimit;

  return {
    longitudinal: {
      ok: passoOk,
      wheelbaseMm: v.wheelbaseMm,
      runwayLengthMm: L,
      marginMm,
      bodyLengthMm: v.lengthMm,
      bodyOverhangMm,
      runwaySpareMm,
      sbordaPedana,
    },
    transversal: {
      ok: carreggiataOk,
      atLimit,
      trackMm: v.trackMm,
      trackMinMm,
      trackMaxMm,
      trackRawMinMm,
      trackRawMaxMm,
      runwayWidthMm: w,
      clearanceMm: c,
      recommendedClearanceMm,
      edgeMarginMm,
      edgeInsetMm,
    },
    capacity: { ok: capacityOk, weightKg: v.weightKg, capacityKg: geom.capacityKg },
    valid,
    atLimit: atLimitOnly,
  };
}
