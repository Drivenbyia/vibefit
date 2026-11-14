import { PALETTE, glow } from '../../../constants/config.js';
import { fmtInt } from '../../../utils/format.js';

/**
 * Fourchette du TDEE mesuré — la signature « valeur contre cible » appliquée
 * à une incertitude. La piste porte l'intervalle à 95 % (remplissage
 * lumineux), le point l'estimation, l'encoche la BASE sur laquelle les cibles
 * sont calculées aujourd'hui. Une fourchette qui recouvre la base se voit
 * d'un coup d'œil : rien ne permet encore de dire que la base est fausse —
 * ce que « ±454 kcal à 95 % » demandait de calculer de tête.
 *
 * Couleur : or tant que la tendance n'est pas lisible (un manque de données),
 * vert une fois lisible. Le plancher de plausibilité est un trait fin, tireté
 * (c'est une borne, pas une mesure) — la forme distingue les trois repères
 * sans dépendre de la couleur.
 */
export default function TdeeRange({ tdee, ci95, baseTDEE, floorKcal, readable }) {
  const lo = tdee - ci95;
  const hi = tdee + ci95;
  const marks = [lo, hi, baseTDEE, floorKcal].filter((v) => Number.isFinite(v));
  const rawMin = Math.min(...marks);
  const rawMax = Math.max(...marks);
  const pad = Math.max((rawMax - rawMin) * 0.08, 20);
  const min = rawMin - pad;
  const span = rawMax + pad - min;
  const at = (v) => `${((v - min) / span) * 100}%`;
  const color = readable === false ? PALETTE.warn : PALETTE.deep;
  const covers = Number.isFinite(baseTDEE) && baseTDEE >= lo && baseTDEE <= hi;

  return (
    <div
      role="img"
      aria-label={`Dépense estimée entre ${fmtInt(lo)} et ${fmtInt(hi)} kilocalories par jour, estimation ${fmtInt(tdee)}`
        + (Number.isFinite(baseTDEE) ? `, base actuelle ${fmtInt(baseTDEE)}, ${covers ? 'dans' : 'hors de'} la fourchette` : '')}
      style={{ marginTop: 12 }}
    >
      <div className="vf-mono vf-tabular" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: PALETTE.ink, marginBottom: 6 }}>
        <span>{fmtInt(lo)}</span>
        <span style={{ color: PALETTE.muted }}>fourchette à 95 %</span>
        <span>{fmtInt(hi)}</span>
      </div>
      <div style={{ position: 'relative', height: 10, margin: '0 2px' }}>
        <div style={{ position: 'absolute', inset: 0, background: PALETTE.surfaceRaised, borderRadius: 999 }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: at(lo), width: `${((hi - lo) / span) * 100}%`,
          background: `${color}59`, border: `1px solid ${color}`, borderRadius: 999, boxShadow: glow(color, 8),
        }} />
        {Number.isFinite(floorKcal) && (
          <div style={{ position: 'absolute', left: at(floorKcal), top: -4, bottom: -4, borderLeft: `2px dashed ${PALETTE.tick}` }} />
        )}
        {Number.isFinite(baseTDEE) && (
          <div style={{
            position: 'absolute', left: at(baseTDEE), top: -4, bottom: -4, width: 3, marginLeft: -1.5,
            borderRadius: 2, background: PALETTE.ink, boxShadow: `0 0 6px ${PALETTE.bg}`,
          }} />
        )}
        <div style={{
          position: 'absolute', left: at(tdee), top: '50%', width: 10, height: 10, margin: '-5px 0 0 -5px',
          borderRadius: 999, background: color, border: `2px solid ${PALETTE.bg}`,
        }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 9, fontSize: 11, color: PALETTE.muted }}>
        <Key swatch={<span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }} />}>
          estimation {fmtInt(tdee)}
        </Key>
        {Number.isFinite(baseTDEE) && (
          <Key swatch={<span style={{ width: 3, height: 12, borderRadius: 2, background: PALETTE.ink, display: 'inline-block' }} />}>
            base des cibles {fmtInt(baseTDEE)}
          </Key>
        )}
        {Number.isFinite(floorKcal) && (
          <Key swatch={<span style={{ height: 12, borderLeft: `2px dashed ${PALETTE.tick}`, display: 'inline-block' }} />}>
            plancher {fmtInt(floorKcal)}
          </Key>
        )}
      </div>
      {Number.isFinite(baseTDEE) && (
        <div style={{ fontSize: 12, color: PALETTE.ink, marginTop: 8, lineHeight: 1.45 }}>
          {covers
            ? `Ta base (${fmtInt(baseTDEE)} kcal) est dans la fourchette : rien n’indique qu’elle soit fausse.`
            : `Ta base (${fmtInt(baseTDEE)} kcal) est ${baseTDEE > hi ? 'au-dessus' : 'en dessous'} de la fourchette.`}
        </div>
      )}
    </div>
  );
}

function Key({ swatch, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      {swatch}
      <span className="vf-tabular">{children}</span>
    </span>
  );
}
