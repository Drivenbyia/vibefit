import { resolveTargets } from './presetUtils.js';
import { addDays, toKey } from './dateUtils.js';
import { sanitizeTargetHistory } from '../models/protocol.js';

/**
 * Cibles EN VIGUEUR À UNE DATE.
 *
 * Sans historique, une semaine d'août était jugée contre la cible d'octobre :
 * l'écart à la cible, le rappel, la tendance calorique et l'adhérence du
 * diagnostic relisaient le passé avec les réglages du jour. Chaque changement
 * de réglage fige désormais les précédents (`recordSettingsChange`), et un
 * jour se résout contre ceux de sa date.
 */

/** Entrée figée couvrant `key` (la première dont `until` ≥ key), ou null. */
export function settingsAt(key, history = []) {
  return history.find((e) => e.until >= key) ?? null;
}

/**
 * Résolveur date → cibles résolues (TRAIN/OFF/WE + cible unique de phase).
 *
 * `current` : cibles courantes déjà résolues (celles d'App). Un jour non
 * couvert par l'historique — aujourd'hui, et tout le passé quand la liste est
 * vide — reçoit exactement cet objet : comportement antérieur inchangé.
 * La cible unique d'une entrée passée est recalculée depuis SON preset et SA
 * base, jamais depuis les réglages courants.
 */
export function targetResolver(current, history = []) {
  const cache = new Map();
  return (key) => {
    const entry = settingsAt(key, history);
    if (!entry) return current;
    if (!cache.has(entry.until)) cache.set(entry.until, resolveTargets(entry));
    return cache.get(entry.until);
  };
}

const SETTINGS_KEYS = ['targets', 'presetId', 'baseTDEE'];
const sameSettings = (a, b) =>
  a.presetId === b.presetId && a.baseTDEE === b.baseTDEE
  && JSON.stringify(a.targets) === JSON.stringify(b.targets);

/**
 * Applique un changement de réglages en figeant ceux qui étaient en vigueur.
 *
 * Les réglages sortants valent jusqu'à HIER : ceux d'aujourd'hui sont les
 * nouveaux, qui s'appliquent à la journée entière. Plusieurs changements le
 * même jour ne figent que le premier état (déjà couvert jusqu'à hier).
 * Un patch qui ne touche pas aux cibles, ou ne les change pas, n'écrit rien.
 * Pur : l'appelant fournit `today`.
 */
export function recordSettingsChange(prev, patch, today = toKey(new Date())) {
  const next = { ...prev, ...patch };
  const touches = SETTINGS_KEYS.some((k) => Object.hasOwn(patch, k));
  if (!touches || sameSettings(prev, next)) return next;
  const history = sanitizeTargetHistory(prev.targetHistory);
  const yesterday = addDays(today, -1);
  if (history.some((e) => e.until >= yesterday)) return { ...next, targetHistory: history };
  const frozen = { until: yesterday, presetId: prev.presetId, baseTDEE: prev.baseTDEE, targets: prev.targets };
  return { ...next, targetHistory: sanitizeTargetHistory([...history, frozen]) };
}
