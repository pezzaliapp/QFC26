// ============================================================================
// QFC26 · Motore geometrico del simulatore
// ----------------------------------------------------------------------------
// Porting puro (framework-agnostic) della logica dinamica di LiftPointDB v15,
// applicata ai sollevatori Cascos a 2 colonne.
//
// Modello: per ogni colonna ci sono 2 perni braccio (anteriore/posteriore).
// Ogni braccio ha una corsa MIN..MAX. Dato un veicolo con 4 punti di presa e
// un offset longitudinale, per ciascun braccio calcoliamo la distanza richiesta
// dal perno al punto di presa e verifichiamo che stia nel range del braccio.
//
// Tutte le coordinate sono in millimetri, sistema cartesiano centrato sul ponte:
//   x = trasversale (negativo = SX, positivo = DX)
//   y = longitudinale (negativo = anteriore, positivo = posteriore)
// ============================================================================

/** Distanza euclidea tra due punti. */
export function dist(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

/**
 * Posizione dei 4 perni braccio per una data geometria + configurazione.
 * @param {object} geom  geometria del ponte (vedi geometry.js → toGeometry)
 * @param {object} cfg   configurazione attiva del ponte
 * @returns {{frontLeft,frontRight,rearLeft,rearRight}} ognuno {x,y,arm,label}
 */
export function getPivots(geom, cfg) {
  const half = geom.internalColumnDistanceMm / 2;
  const inset = geom.columnOffsetMm ?? 90; // rientro perno dalla colonna
  const frontY = cfg.frontPivotYmm;
  const rearY = cfg.rearPivotYmm;
  return {
    frontLeft:  { x: -half + inset, y: frontY, arm: cfg.frontArm, label: 'Ant SX' },
    frontRight: { x:  half - inset, y: frontY, arm: cfg.frontArm, label: 'Ant DX' },
    rearLeft:   { x: -half + inset, y: rearY,  arm: cfg.rearArm,  label: 'Post SX' },
    rearRight:  { x:  half - inset, y: rearY,  arm: cfg.rearArm,  label: 'Post DX' },
  };
}

/**
 * Calcolo per-braccio: distanza richiesta, validità, punti MIN/MAX e target.
 * @param {object} geom
 * @param {object} cfg
 * @param {object} vehicle  veicolo con liftPoints {frontLeft,frontRight,rearLeft,rearRight}
 * @param {number} offset   spostamento longitudinale del veicolo (mm)
 * @returns {Array} un elemento per braccio
 */
export function calcArms(geom, cfg, vehicle, offset = 0) {
  const piv = getPivots(geom, cfg);
  return Object.keys(piv).map((k) => {
    const p = piv[k];
    const target = { x: vehicle.liftPoints[k].x, y: vehicle.liftPoints[k].y + offset };
    const req = dist(p.x, p.y, target.x, target.y);
    const ux = req === 0 ? 0 : (target.x - p.x) / req;
    const uy = req === 0 ? 0 : (target.y - p.y) / req;
    return {
      key: k,
      label: p.label,
      pivot: p,
      target,
      arm: p.arm,
      required: Math.round(req),
      ok: req >= p.arm.minMm && req <= p.arm.maxMm,
      minPoint: { x: p.x + ux * p.arm.minMm, y: p.y + uy * p.arm.minMm },
      maxPoint: { x: p.x + ux * p.arm.maxMm, y: p.y + uy * p.arm.maxMm },
    };
  });
}

/**
 * Valutazione completa di una posizione.
 * @returns {{arms, capacityOk, valid, mountDistance}}
 */
export function evaluate(geom, cfg, vehicle, offset = 0) {
  const arms = calcArms(geom, cfg, vehicle, offset);
  const capacityOk = vehicle.weightKg <= geom.capacityKg;
  const armsOk = arms.every((a) => a.ok);
  const mountDistance = Math.abs(cfg.rearPivotYmm - cfg.frontPivotYmm);
  return {
    arms,
    capacityOk,
    armsOk,
    valid: capacityOk && armsOk,
    mountDistance,
  };
}

/**
 * Solver: cerca il primo offset valido nello sweep dato.
 * @returns {number|null} offset valido oppure null
 */
export function findBestOffset(geom, cfg, vehicle, { min = -1000, max = 1000, step = 10 } = {}) {
  if (vehicle.weightKg > geom.capacityKg) return null; // portata insufficiente: inutile cercare
  for (let o = min; o <= max; o += step) {
    const r = evaluate(geom, cfg, vehicle, o);
    if (r.valid) return o;
  }
  return null;
}

/**
 * Range di offset validi (utile per disegnare una "finestra di sicurezza").
 * @returns {{min:number,max:number}|null}
 */
export function validOffsetWindow(geom, cfg, vehicle, { min = -1000, max = 1000, step = 10 } = {}) {
  let lo = null, hi = null;
  for (let o = min; o <= max; o += step) {
    if (evaluate(geom, cfg, vehicle, o).valid) {
      if (lo === null) lo = o;
      hi = o;
    }
  }
  return lo === null ? null : { min: lo, max: hi };
}
