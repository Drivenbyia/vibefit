import { addDays, toKey } from './dateUtils.js';
import { num } from './mathUtils.js';
import { deviceAt, isReferenceMeasure } from '../models/protocol.js';

/**
 * Référence de récupération — VFC (RMSSD de la nuit) et FC repos contre TA
 * propre habitude. Module PUR, lecture seule.
 *
 * Inspiré des apps de récupération (référence glissante personnelle), avec
 * les règles VibeFit du 2026-10-24 : seules les nuits de la montre portée
 * AUJOURD'HUI comptent (une VFC Garmin ne se compare pas à une VFC Apple),
 * jours partiels exclus, et la plage habituelle n'existe qu'à partir de
 * BASELINE_NIGHTS nuits. Aucun verdict ici : des mesures et une plage.
 */
// Fenêtre AFFICHÉE (nuit par nuit) et fenêtre de RÉFÉRENCE : distinctes. Exiger
// 28 nuits dans 28 jours rendait la référence inatteignable à la première
// nuit manquante (trouvé au rendu : 40 nuits, 2 trous ⇒ bloqué à 26/28).
export const RECOVERY_WINDOW_DAYS = 28;
export const BASELINE_WINDOW_DAYS = 60;
export const BASELINE_NIGHTS = 28;
export const RECENT_NIGHTS = 7;

// Bornes de plausibilité : une faute de frappe ne doit pas tordre la plage.
const PLAUSIBLE = { hrv: [5, 250], rhr: [30, 120] };

const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1));
};

function metric(nights, field) {
  const shown = nights.slice(-RECOVERY_WINDOW_DAYS);
  const values = shown.map((n) => n[field]);
  const present = nights.map((n) => n[field]).filter((v) => v != null);
  const recent = nights.slice(-RECENT_NIGHTS).map((n) => n[field]).filter((v) => v != null);
  const ready = present.length >= BASELINE_NIGHTS;
  const m = ready ? mean(present) : null;
  const s = ready ? sd(present) : null;
  return {
    values,
    nights: present.length,
    recent: recent.length > 0 ? mean(recent) : null,
    recentNights: recent.length,
    baseline: ready ? { mean: m, lo: m - s, hi: m + s } : null,
  };
}

/**
 * @returns {{ source, since, keys, hrv, rhr }} — `hrv` et `rhr` :
 *   values (une par jour des 28 derniers, null si nuit absente ou exclue),
 *   nights (nuits valides sur 60 jours), recent / recentNights (moyenne des
 *   7 derniers jours et nuits réellement mesurées), baseline (null tant que
 *   la référence est en construction).
 */
export function computeRecovery(data, { today = toKey(new Date()) } = {}) {
  const devices = data?.devices ?? [];
  const periods = data?.periods ?? [];
  const source = devices.length > 0 ? deviceAt(today, devices) : null;
  const ref = { devices, periods, referenceSource: source };
  const since = devices.find((d) => d.source === source && (d.from == null || d.from <= today) && (d.to == null || today <= d.to))?.from ?? null;

  const keys = Array.from({ length: BASELINE_WINDOW_DAYS }, (_, i) => addDays(today, i - BASELINE_WINDOW_DAYS + 1));
  const nights = keys.map((key) => {
    const day = data?.days?.[key];
    if (!day || !isReferenceMeasure(key, day, 'sleep', ref)) return { key, hrv: null, rhr: null };
    const read = (f) => {
      const v = num(day.sleep?.[f]);
      const [lo, hi] = PLAUSIBLE[f];
      return v >= lo && v <= hi ? v : null;
    };
    return { key, hrv: read('hrv'), rhr: read('rhr') };
  });

  return { source, since, keys: keys.slice(-RECOVERY_WINDOW_DAYS), hrv: metric(nights, 'hrv'), rhr: metric(nights, 'rhr') };
}
