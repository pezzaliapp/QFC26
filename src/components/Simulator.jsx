// ============================================================================
// QFC26 · Simulatore geometrico (vista React)
// ----------------------------------------------------------------------------
// Due modalità:
//   · 2 COLONNE  — modello a bracci (porting LiftPointDB v15), engine/simulator.js
//   · 4 COLONNE  — modello "drive-on" su pedane (F5), engine/drive-on.js
// Tema navy/glass QFC26.
// ============================================================================
import { useMemo, useState, useEffect } from 'react';
import { buildGeometries, buildDriveOnGeometries, VEHICLE_TEMPLATES, getVehicle } from '../data/geometry.js';
import { evaluate, findBestOffset } from '../engine/simulator.js';
import { evaluateDriveOn, wheelStatus } from '../engine/drive-on.js';

const C = {
  pivot: '#e5e7eb', min: '#38bdf8', max: '#22c55e',
  ok: '#facc15', bad: '#ef4444', col: '#9ca3af', car: '#1e293b',
  good: '#22c55e', warn: '#f59e0b', goodFill: 'rgba(34,197,94,0.16)', badFill: 'rgba(239,68,68,0.16)',
};

function Metric({ label, value }) {
  return (
    <div className="glass rounded-xl px-3 py-2">
      <div className="text-[10px] uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-amber-400 font-mono font-bold text-sm leading-tight mt-0.5">{value}</div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2 COLONNE — disegno SVG (port di draw() di LiftPointDB)
// ════════════════════════════════════════════════════════════════════════════
function Drawing({ geom, cfg, vehicle, arms, offset, valid, mountDistance }) {
  const W = 1240, H = 760, s = 0.16, cx = W / 2, cy = H / 2;
  const sx = (x) => cx + x * s;
  const sy = (y) => cy + y * s;
  const half = geom.internalColumnDistanceMm / 2;
  const colL = sx(-half), colR = sx(half);
  const carW = vehicle.widthMm * s, carL = vehicle.lengthMm * s;
  const carX = cx - carW / 2, carY = cy - carL / 2 + offset * s;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" className="block">
      <rect width={W} height={H} fill="#030712" />
      <text x="24" y="34" fill={C.ok} fontSize="20" fontWeight="800">
        {geom.code} / {cfg.name} / {vehicle.name}
      </text>
      <text x="24" y="56" fill="#cbd5e1" fontSize="12">{cfg.description}</text>

      {/* Colonne */}
      <line x1={colL} y1="92" x2={colL} y2={H - 110} stroke={C.col} strokeWidth="12" />
      <line x1={colR} y1="92" x2={colR} y2={H - 110} stroke={C.col} strokeWidth="12" />
      <text x={colL - 45} y="84" fill="#cbd5e1" fontSize="13">Colonna SX</text>
      <text x={colR - 45} y="84" fill="#cbd5e1" fontSize="13">Colonna DX</text>

      {/* Veicolo */}
      <rect x={carX} y={carY} width={carW} height={carL} rx="44"
        fill={C.car} stroke={valid ? C.max : C.min} strokeWidth="3" opacity="0.92" />
      <line x1={cx} y1={carY + 10} x2={cx} y2={carY + carL - 10} stroke={C.min} strokeDasharray="8 6" />
      <text x={cx - 50} y={carY + 34} fill="#bae6fd" fontSize="14">VEICOLO</text>

      {/* Bracci */}
      {arms.map((a) => {
        const px = sx(a.pivot.x), py = sy(a.pivot.y);
        const minx = sx(a.minPoint.x), miny = sy(a.minPoint.y);
        const maxx = sx(a.maxPoint.x), maxy = sy(a.maxPoint.y);
        const tx = sx(a.target.x), ty = sy(a.target.y);
        const main = a.ok ? C.ok : C.bad;
        return (
          <g key={a.key}>
            <line x1={px} y1={py} x2={maxx} y2={maxy} stroke="#475569" strokeWidth="18" strokeLinecap="round" />
            <line x1={px} y1={py} x2={minx} y2={miny} stroke={C.min} strokeWidth="12" strokeLinecap="round" />
            <line x1={minx} y1={miny} x2={maxx} y2={maxy} stroke={C.max} strokeWidth="8" strokeLinecap="round" />
            <line x1={px} y1={py} x2={tx} y2={ty} stroke={main} strokeWidth="3" strokeDasharray="6 5" />
            <circle cx={px} cy={py} r="8" fill={C.pivot} />
            <circle cx={minx} cy={miny} r="10" fill={C.min} />
            <circle cx={maxx} cy={maxy} r="10" fill={C.max} />
            <circle cx={tx} cy={ty} r="9" fill={main} stroke="#fff" strokeWidth="2" />
            <text x={tx + 10} y={ty - 8} fill={main} fontSize="13">{a.label} {a.required}mm</text>
          </g>
        );
      })}

      {/* Quote distanza attacchi (stessa colonna) */}
      {(() => {
        const yF = sy(cfg.frontPivotYmm), yR = sy(cfg.rearPivotYmm);
        const lX = sx(-half) - 46, rX = sx(half) + 46, midY = (yF + yR) / 2;
        const tick = (x) => (
          <g>
            <line x1={x} y1={yF} x2={x} y2={yR} stroke={C.ok} strokeWidth="3" />
            <line x1={x - 12} y1={yF} x2={x + 12} y2={yF} stroke={C.ok} strokeWidth="3" />
            <line x1={x - 12} y1={yR} x2={x + 12} y2={yR} stroke={C.ok} strokeWidth="3" />
          </g>
        );
        return (
          <g>
            {tick(lX)}
            <text x={lX - 118} y={midY - 6} fill={C.ok} fontSize="12">ATTACCHI BRACCI</text>
            <text x={lX - 80} y={midY + 13} fill={C.ok} fontSize="16" fontWeight="700">{mountDistance} mm</text>
            {tick(rX)}
            <text x={rX + 16} y={midY - 6} fill={C.ok} fontSize="12">ATTACCHI BRACCI</text>
            <text x={rX + 50} y={midY + 13} fill={C.ok} fontSize="16" fontWeight="700">{mountDistance} mm</text>
          </g>
        );
      })()}

      {/* Quota interno colonne */}
      <line x1={colL} y1={H - 68} x2={colR} y2={H - 68} stroke="#cbd5e1" strokeWidth="2" />
      <text x={cx - 84} y={H - 78} fill="#f8fafc" fontSize="15">INTERNO COLONNE</text>
      <text x={cx - 36} y={H - 48} fill="#f8fafc" fontSize="15">{geom.internalColumnDistanceMm} mm</text>
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4 COLONNE — disegno SVG vista dall'alto: due pedane + veicolo + 4 ruote
// ════════════════════════════════════════════════════════════════════════════
function DrawingDriveOn({ geom, vehicle, res }) {
  const W = 1240, H = 760, cx = W / 2, cy = H / 2;
  const t = res.transversal, l = res.longitudinal;
  const L = geom.runwayLengthMm, w = geom.runwayWidthMm;
  const rec = t.recommendedClearanceMm ?? geom.runwayClearanceMm?.minMm ?? 800;
  const track = t.trackMm, wheelbase = l.wheelbaseMm;
  const vehL = vehicle.lengthMm, vehW = vehicle.widthMm;

  // Scala per far stare il contenuto (longitudinale e trasversale) nel viewBox.
  const overallW = rec + 2 * w;
  const contentLen = Math.max(L || 0, vehL || 0) || 1;
  const contentWid = Math.max(overallW || 0, vehW || 0, (track || 0) + 200) || 1;
  const s = Math.min((H - 150) / contentLen, (W - 220) / contentWid);
  const sx = (x) => cx + x * s;
  const sy = (y) => cy + y * s;

  // Pedane (lato DX e SX).
  const rIn = rec / 2, rOut = rec / 2 + w;
  const runwayTop = sy(-L / 2), runwayH = L * s;
  const runwayState = t.ok ? 'safe' : (t.atLimit ? 'limit' : 'off');
  const stateColor = { safe: C.good, limit: C.warn, off: C.bad };
  const stateFill = { safe: C.goodFill, limit: 'rgba(245,158,11,0.16)', off: C.badFill };
  const runwayFill = stateFill[runwayState];
  const runwayStroke = stateColor[runwayState];

  // Ruote (footprint) ai 4 angoli del rettangolo passo×carreggiata.
  const wheels = (track != null && wheelbase != null) ? [
    { id: 'AS', x: -track / 2, y: -wheelbase / 2 },
    { id: 'AD', x: track / 2, y: -wheelbase / 2 },
    { id: 'PS', x: -track / 2, y: wheelbase / 2 },
    { id: 'PD', x: track / 2, y: wheelbase / 2 },
  ] : [];
  const wheelW = 190 * s, wheelH = 320 * s;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="auto" className="block">
      <rect width={W} height={H} fill="#030712" />
      <text x="24" y="34" fill={C.ok} fontSize="20" fontWeight="800">
        {geom.code} (4 colonne) / {vehicle.name}
      </text>
      <text x="24" y="56" fill="#cbd5e1" fontSize="12">
        Drive-on · vista dall'alto · luce pedane impostata a {rec} mm (consigliata)
      </text>

      {/* Pedane */}
      {[1, -1].map((sgn) => (
        <g key={sgn}>
          <rect x={sx(sgn > 0 ? rIn : -rOut)} y={runwayTop} width={w * s} height={runwayH}
            fill={runwayFill} stroke={runwayStroke} strokeWidth="3" rx="6" />
          <text x={sx(sgn > 0 ? (rIn + rOut) / 2 : -(rIn + rOut) / 2)} y={runwayTop - 10}
            fill="#cbd5e1" fontSize="12" textAnchor="middle">PEDANA {sgn > 0 ? 'DX' : 'SX'}</text>
        </g>
      ))}

      {/* Veicolo (ingombro) */}
      {vehL != null && vehW != null && (
        <rect x={sx(-vehW / 2)} y={sy(-vehL / 2)} width={vehW * s} height={vehL * s} rx="40"
          fill={C.car} stroke={res.valid ? C.max : C.min} strokeWidth="3" opacity="0.85" />
      )}
      <line x1={cx} y1={sy(-((vehL || L) / 2))} x2={cx} y2={sy((vehL || L) / 2)}
        stroke={C.min} strokeDasharray="8 6" opacity="0.7" />

      {/* Asse passo (interasse ruote) */}
      {wheelbase != null && (
        <g>
          <line x1={sx(-track / 2)} y1={sy(-wheelbase / 2)} x2={sx(track / 2)} y2={sy(-wheelbase / 2)} stroke="#64748b" strokeWidth="2" />
          <line x1={sx(-track / 2)} y1={sy(wheelbase / 2)} x2={sx(track / 2)} y2={sy(wheelbase / 2)} stroke="#64748b" strokeWidth="2" />
        </g>
      )}

      {/* Ruote */}
      {wheels.map((wh) => {
        const st = wheelStatus(geom, rec, Math.abs(wh.x), Math.abs(wh.y), t.edgeInsetMm);
        const col = stateColor[st.state];
        return (
          <g key={wh.id}>
            <rect x={sx(wh.x) - wheelW / 2} y={sy(wh.y) - wheelH / 2} width={wheelW} height={wheelH}
              rx="6" fill={col} stroke="#fff" strokeWidth="2" opacity="0.95" />
            <text x={sx(wh.x)} y={sy(wh.y) + 5} fill="#0b1220" fontSize="12" fontWeight="800" textAnchor="middle">{wh.id}</text>
          </g>
        );
      })}

      {/* Quota lunghezza pedana (verticale, a sinistra) */}
      <line x1={sx(-rOut) - 34} y1={runwayTop} x2={sx(-rOut) - 34} y2={runwayTop + runwayH} stroke="#cbd5e1" strokeWidth="2" />
      <text x={sx(-rOut) - 40} y={cy} fill="#f8fafc" fontSize="13" textAnchor="end"
        transform={`rotate(-90 ${sx(-rOut) - 40} ${cy})`}>PEDANA {L} mm</text>

      {/* Quota luce interna (orizzontale, in alto) */}
      <line x1={sx(-rIn)} y1={runwayTop - 30} x2={sx(rIn)} y2={runwayTop - 30} stroke={C.ok} strokeWidth="2" />
      <text x={cx} y={runwayTop - 36} fill={C.ok} fontSize="12" textAnchor="middle">LUCE INTERNA {rec} mm</text>

      {/* Quota carreggiata (in basso) */}
      {track != null && (
        <g>
          <line x1={sx(-track / 2)} y1={sy(L / 2) + 30} x2={sx(track / 2)} y2={sy(L / 2) + 30}
            stroke={stateColor[runwayState]} strokeWidth="2" />
          <text x={cx} y={sy(L / 2) + 48} fill={stateColor[runwayState]} fontSize="13" textAnchor="middle">
            CARREGGIATA {track} mm{t.atLimit ? ` · al limite (rientro ${t.edgeMarginMm} mm)` : ''}
          </text>
        </g>
      )}
    </svg>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 2 COLONNE — pannello
// ════════════════════════════════════════════════════════════════════════════
function Sim2Col({ products, initialLiftId, initialVehId }) {
  const geoms = useMemo(() => buildGeometries(products), [products]);

  const startLift = (initialLiftId && geoms.some((g) => g.id === initialLiftId))
    ? initialLiftId
    : (geoms[0]?.id || null);
  const startVeh = initialVehId && VEHICLE_TEMPLATES.some((v) => v.id === initialVehId)
    ? initialVehId
    : 'car';

  const [liftId, setLiftId] = useState(startLift);
  const [cfgId, setCfgId] = useState('standard');
  const [vehId, setVehId] = useState(startVeh);
  const [offset, setOffset] = useState(0);
  const [showLogic, setShowLogic] = useState(false);

  const geom = geoms.find((g) => g.id === liftId) || geoms[0];
  const cfg = geom?.configurations.find((c) => c.id === cfgId) || geom?.configurations[0];
  const vehicle = getVehicle(vehId);

  useEffect(() => {
    if (!geom) return;
    const c = geom.configurations.find((x) => x.id === cfgId) || geom.configurations[0];
    setCfgId(c.id);
    const veh = getVehicle(vehId);
    const best = findBestOffset(geom, c, veh);
    setOffset(best ?? c.vehicleShiftPresetMm ?? 0);
  }, [liftId]); // eslint-disable-line

  useEffect(() => {
    if (!geom || !cfg) return;
    const best = findBestOffset(geom, cfg, getVehicle(vehId));
    setOffset(best ?? cfg.vehicleShiftPresetMm ?? 0);
  }, [vehId]); // eslint-disable-line

  if (!geom) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-300">
        Nessun modello a 2 colonne disponibile per il simulatore.
      </div>
    );
  }

  const res = evaluate(geom, cfg, vehicle, offset);

  const handleFindBest = () => {
    const best = findBestOffset(geom, cfg, vehicle);
    if (best === null) {
      alert('Nessuna posizione valida nel range ±1000 mm (verifica portata e geometria).');
    } else setOffset(best);
  };
  const applyPreset = () => setOffset(cfg.vehicleShiftPresetMm || 0);

  return (
    <div className="space-y-4">
      {/* Metriche */}
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Ponte" value={geom.code} />
        <Metric label="Portata" value={`${geom.capacityKg} kg`} />
        <Metric label="Interno col." value={`${geom.internalColumnDistanceMm} mm`} />
        <Metric label="Attacchi" value={`${res.mountDistance} mm`} />
        <Metric label="Config." value={cfg.name} />
        <Metric label="H max" value={geom.maxLiftHeightMm ? `${geom.maxLiftHeightMm} mm` : '—'} />
      </div>

      {/* Controlli */}
      <div className="glass rounded-xl p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-slate-400">Ponte (2 colonne)</span>
            <select value={liftId} onChange={(e) => setLiftId(e.target.value)}
              className="w-full mt-1 bg-navy-950 border border-navy-700 rounded-lg px-2 py-2 text-sm text-white">
              {geoms.map((g) => (
                <option key={g.id} value={g.id}>{g.code} — {g.capacityKg}kg — int.{g.internalColumnDistanceMm}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Configurazione</span>
            <select value={cfg.id} onChange={(e) => { setCfgId(e.target.value); applyPreset(); }}
              className="w-full mt-1 bg-navy-950 border border-navy-700 rounded-lg px-2 py-2 text-sm text-white">
              {geom.configurations.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Veicolo (template)</span>
            <select value={vehId} onChange={(e) => setVehId(e.target.value)}
              className="w-full mt-1 bg-navy-950 border border-navy-700 rounded-lg px-2 py-2 text-sm text-white">
              {VEHICLE_TEMPLATES.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.weightKg}kg</option>)}
            </select>
          </label>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Posizione veicolo</span>
            <span className="font-mono text-white">{offset} mm</span>
          </div>
          <input type="range" min={-1000} max={1000} step={10} value={offset}
            onChange={(e) => setOffset(parseInt(e.target.value, 10))}
            className="w-full accent-amber-400 mt-1" />
          <div className="flex gap-2 mt-2">
            <button onClick={handleFindBest}
              className="flex-1 bg-amber-400 text-navy-900 font-bold rounded-lg py-2 text-sm">Trova posizione valida</button>
            <button onClick={applyPreset}
              className="flex-1 bg-navy-700 text-white rounded-lg py-2 text-sm">Preset config.</button>
            <button onClick={() => setOffset(0)}
              className="flex-1 bg-navy-700 text-white rounded-lg py-2 text-sm">Centra</button>
          </div>
        </div>
      </div>

      {/* Esito */}
      <div className={`glass rounded-xl p-4 border ${res.valid ? 'border-emerald-500/40' : 'border-red-500/40'}`}>
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className={`font-bold ${res.valid ? 'text-emerald-400' : 'text-red-400'}`}>
            {res.valid ? 'POSIZIONE VALIDA' : 'POSIZIONE NON VALIDA'}
          </span>
          <span className={`text-[11px] px-2 py-0.5 rounded-full ${res.capacityOk ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}`}>
            Portata {res.capacityOk ? 'OK' : 'NO'} {vehicle.weightKg}/{geom.capacityKg} kg
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-300">Verifica fisica obbligatoria</span>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 text-xs">
            <th className="text-left py-1">Braccio</th><th>MIN</th><th>Richiesto</th><th>MAX</th><th>Stato</th>
          </tr></thead>
          <tbody>
            {res.arms.map((a) => (
              <tr key={a.key} className="border-t border-navy-700/60">
                <td className="py-1 text-slate-200">{a.label}</td>
                <td className="text-center font-mono text-slate-400">{a.arm.minMm}</td>
                <td className="text-center font-mono text-white">{a.required}</td>
                <td className="text-center font-mono text-slate-400">{a.arm.maxMm}</td>
                <td className="text-center">{a.ok ? '✅' : '❌'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {geom.template && (
          <p className="text-[11px] text-amber-300/80 mt-2">
            ⚠︎ Geometria parzialmente template (rientro perni / distanza attacchi / punti presa veicolo): sostituire con dati ufficiali in <code>geometry.js</code>.
          </p>
        )}
      </div>

      {/* Disegno */}
      <div className="rounded-2xl overflow-hidden border border-navy-700">
        <Drawing geom={geom} cfg={cfg} vehicle={vehicle} arms={res.arms}
          offset={offset} valid={res.valid} mountDistance={res.mountDistance} />
      </div>

      {/* Logica calcolo */}
      <div className="glass rounded-xl p-3">
        <button onClick={() => setShowLogic((v) => !v)} className="text-xs text-accent-light">
          {showLogic ? '▾' : '▸'} Logica di calcolo
        </button>
        {showLogic && (
          <pre className="mt-2 text-[11px] text-slate-300 bg-navy-950 rounded-lg p-3 overflow-auto max-h-64">
{JSON.stringify({
  ponte: geom.code,
  configurazione: cfg.name,
  interno_colonne_mm: geom.internalColumnDistanceMm,
  distanza_attacchi_mm: res.mountDistance,
  offset_veicolo_mm: offset,
  formula: 'richiesto = distanza(perno braccio, punto presa veicolo spostato)',
  verifica: 'MIN <= richiesto <= MAX  &&  peso <= portata',
  risultati: res.arms.map((a) => ({ braccio: a.label, min: a.arm.minMm, richiesto: a.required, max: a.arm.maxMm, ok: a.ok })),
}, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// 4 COLONNE — pannello drive-on
// ════════════════════════════════════════════════════════════════════════════
function AxisRow({ label, ok, state, children }) {
  const s = state || (ok ? 'ok' : 'bad');
  const icon = { ok: '✅', limit: '⚠️', bad: '❌' }[s];
  return (
    <tr className="border-t border-navy-700/60 align-top">
      <td className="py-2 text-slate-200 whitespace-nowrap">{label}</td>
      <td className="py-2 text-slate-300 text-xs">{children}</td>
      <td className="py-2 text-center">{icon}</td>
    </tr>
  );
}

function Sim4Col({ products, initialLiftId, initialVehId }) {
  const geoms = useMemo(() => buildDriveOnGeometries(products), [products]);

  const startLift = (initialLiftId && geoms.some((g) => g.id === initialLiftId))
    ? initialLiftId
    : (geoms[0]?.id || null);
  const startVeh = initialVehId && VEHICLE_TEMPLATES.some((v) => v.id === initialVehId)
    ? initialVehId
    : 'car';

  const [liftId, setLiftId] = useState(startLift);
  const [vehId, setVehId] = useState(startVeh);
  const [showLogic, setShowLogic] = useState(false);

  const geom = geoms.find((g) => g.id === liftId) || geoms[0];
  const vehicle = getVehicle(vehId);

  if (!geom) {
    return (
      <div className="glass rounded-xl p-6 text-center text-slate-300">
        Nessun modello a 4 colonne disponibile per il simulatore.
      </div>
    );
  }

  const res = evaluateDriveOn(geom, vehicle);
  const clr = geom.runwayClearanceMm;
  const t = res.transversal, l = res.longitudinal, cap = res.capacity;
  const headState = res.valid ? 'ok' : (res.atLimit ? 'limit' : 'bad');
  const headBorder = { ok: 'border-emerald-500/40', limit: 'border-amber-500/50', bad: 'border-red-500/40' }[headState];
  const headText = { ok: 'text-emerald-400', limit: 'text-amber-400', bad: 'text-red-400' }[headState];
  const headLabel = { ok: 'VEICOLO COMPATIBILE', limit: 'COMPATIBILE AL LIMITE', bad: 'VEICOLO NON COMPATIBILE' }[headState];

  return (
    <div className="space-y-4">
      {/* Metriche */}
      <div className="grid grid-cols-3 gap-2">
        <Metric label="Ponte" value={geom.code} />
        <Metric label="Portata" value={`${geom.capacityKg} kg`} />
        <Metric label="Pedana" value={geom.runwayLengthMm ? `${geom.runwayLengthMm} mm` : '—'} />
        <Metric label="Larg. runway" value={geom.runwayWidthMm ? `${geom.runwayWidthMm} mm` : '—'} />
        <Metric label="Luce interna" value={clr ? `${clr.minMm}–${clr.maxMm} mm` : '—'} />
        <Metric label="H max" value={geom.maxLiftHeightMm ? `${geom.maxLiftHeightMm} mm` : '—'} />
      </div>

      {/* Controlli */}
      <div className="glass rounded-xl p-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-slate-400">Ponte (4 colonne)</span>
            <select value={liftId} onChange={(e) => setLiftId(e.target.value)}
              className="w-full mt-1 bg-navy-950 border border-navy-700 rounded-lg px-2 py-2 text-sm text-white">
              {geoms.map((g) => (
                <option key={g.id} value={g.id}>{g.code} — {g.capacityKg}kg — ped.{g.runwayLengthMm}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-slate-400">Veicolo (template)</span>
            <select value={vehId} onChange={(e) => setVehId(e.target.value)}
              className="w-full mt-1 bg-navy-950 border border-navy-700 rounded-lg px-2 py-2 text-sm text-white">
              {VEHICLE_TEMPLATES.map((v) => <option key={v.id} value={v.id}>{v.name} — {v.weightKg}kg</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Esito per asse */}
      <div className={`glass rounded-xl p-4 border ${headBorder}`}>
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className={`font-bold ${headText}`}>{headLabel}</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-600/20 text-amber-300">Verifica fisica obbligatoria</span>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="text-slate-400 text-xs">
            <th className="text-left py-1">Verifica</th><th className="text-left py-1">Dettaglio</th><th>Stato</th>
          </tr></thead>
          <tbody>
            <AxisRow label="Longitudinale" ok={l.ok}>
              Passo veicolo <strong className="text-white">{l.wheelbaseMm} mm</strong> ≤ pedana <strong className="text-white">{l.runwayLengthMm} mm</strong>
              {l.marginMm != null && <span className="text-slate-400"> · margine {l.marginMm} mm</span>}
              {l.bodyOverhangMm != null && (
                <span className={l.sbordaPedana ? 'text-amber-300' : 'text-slate-400'}>
                  {' '}· sbalzo carrozzeria {l.bodyOverhangMm} mm/lato{l.sbordaPedana ? ' (oltre la pedana)' : ''}
                </span>
              )}
            </AxisRow>
            <AxisRow label="Trasversale" ok={t.ok} state={t.ok ? 'ok' : (t.atLimit ? 'limit' : 'bad')}>
              Carreggiata <strong className="text-white">{t.trackMm} mm</strong> nel range sicuro <strong className="text-white">{t.trackMinMm}–{t.trackMaxMm} mm</strong>
              {t.recommendedClearanceMm != null && <span className="text-slate-400"> · luce consigliata {t.recommendedClearanceMm} mm</span>}
              {t.edgeMarginMm != null && (
                <span className={t.atLimit ? 'text-amber-300' : 'text-slate-400'}>
                  {' '}· rientro ruota {t.edgeMarginMm} mm (min {t.edgeInsetMm} mm){t.atLimit ? ' — AL LIMITE' : ''}
                </span>
              )}
            </AxisRow>
            <AxisRow label="Portata" ok={cap.ok}>
              Peso <strong className="text-white">{cap.weightKg} kg</strong> ≤ portata <strong className="text-white">{cap.capacityKg} kg</strong>
            </AxisRow>
          </tbody>
        </table>
        {res.atLimit && (
          <p className="text-[11px] text-amber-300/90 mt-2">
            ⚠︎ Una o più ruote appoggiano a meno di {t.edgeInsetMm} mm dal bordo della pedana: posizionamento al limite, da verificare fisicamente in officina.
          </p>
        )}
        {geom.template && (
          <p className="text-[11px] text-amber-300/80 mt-2">
            ⚠︎ Misure pedane parzialmente template: completare in <code>geometry.js</code> (DRIVEON_OVERRIDES).
          </p>
        )}
      </div>

      {/* Disegno vista dall'alto */}
      <div className="rounded-2xl overflow-hidden border border-navy-700">
        <DrawingDriveOn geom={geom} vehicle={vehicle} res={res} />
      </div>

      {/* Logica calcolo */}
      <div className="glass rounded-xl p-3">
        <button onClick={() => setShowLogic((v) => !v)} className="text-xs text-accent-light">
          {showLogic ? '▾' : '▸'} Logica di calcolo
        </button>
        {showLogic && (
          <pre className="mt-2 text-[11px] text-slate-300 bg-navy-950 rounded-lg p-3 overflow-auto max-h-64">
{JSON.stringify({
  ponte: geom.code,
  pedana_lunghezza_mm: geom.runwayLengthMm,
  runway_larghezza_mm: geom.runwayWidthMm,
  luce_interna_mm: clr,
  veicolo: { passo: l.wheelbaseMm, carreggiata: t.trackMm, peso: cap.weightKg },
  verifica: {
    longitudinale: 'passo <= lunghezza pedana',
    trasversale: 'clearanceMin <= carreggiata <= clearanceMax + 2*larghezza',
    portata: 'peso <= portata',
  },
  esito: { longitudinale: l.ok, trasversale: t.ok, portata: cap.ok, valido: res.valid },
}, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Contenitore con toggle modalità
// ════════════════════════════════════════════════════════════════════════════
export default function Simulator({ products, onBack, initialLiftId = null, initialVehId = null, initialMode = '2col' }) {
  const [mode, setMode] = useState(initialMode === '4col' ? '4col' : '2col');

  // Se cambia il target (apertura da scheda), riallinea la modalità.
  useEffect(() => { setMode(initialMode === '4col' ? '4col' : '2col'); }, [initialMode, initialLiftId]);

  const is4 = mode === '4col';

  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">Simulatore geometrico</h2>
          <p className="text-xs text-slate-400">
            {is4 ? 'Drive-on su pedane · 4 colonne' : 'Verifica presa bracci · 2 colonne (porting LiftPointDB)'}
          </p>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-xs text-slate-400 hover:text-white">← Indietro</button>
        )}
      </div>

      {/* Toggle modalità */}
      <div className="glass rounded-xl p-1 flex gap-1">
        <button
          onClick={() => setMode('2col')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${!is4 ? 'bg-amber-400 text-navy-900' : 'text-slate-300 hover:text-white'}`}>
          2 Colonne · bracci
        </button>
        <button
          onClick={() => setMode('4col')}
          className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${is4 ? 'bg-amber-400 text-navy-900' : 'text-slate-300 hover:text-white'}`}>
          4 Colonne · drive-on
        </button>
      </div>

      {is4
        ? <Sim4Col products={products} initialLiftId={initialLiftId} initialVehId={initialVehId} />
        : <Sim2Col products={products} initialLiftId={initialLiftId} initialVehId={initialVehId} />}
    </div>
  );
}
