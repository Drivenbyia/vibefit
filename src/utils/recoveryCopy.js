import { BASELINE_NIGHTS } from './recoveryBaseline.js';

const r = (v) => Math.round(v);
export const ddmm = (key) => `${key.slice(8, 10)}/${key.slice(5, 7)}`;

/** « 49 ms » / « — » */
export const fmtMetric = (v, unit) => (v == null ? '—' : `${r(v)} ${unit}`);

/** « plage habituelle 44–54 ms », ou l'avancement de la référence. */
export function rangeLabel(m, unit) {
  if (m.baseline) return `plage habituelle ${r(m.baseline.lo)}–${r(m.baseline.hi)} ${unit}`;
  return `référence en construction · ${m.nights}/${BASELINE_NIGHTS} nuits`;
}
