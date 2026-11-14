import { num } from './mathUtils.js';
import { addDays } from './dateUtils.js';
import { isExcluded } from '../models/protocol.js';

/**
 * Complétude de la saisie d'un jour — module PUR, lecture seule.
 *
 * Quatre mesures font un jour exploitable : la pesée et l'apport (le TDEE ne
 * compte que les jours qui croisent les deux), les pas (NEAT) et le sommeil
 * (récupération). Elles se saisissent à des moments différents — pesée et
 * nuit le matin, apport et pas le soir ou le lendemain — et rien ne disait,
 * sans faire défiler trois écrans, laquelle manquait.
 */
export const ENTRY = { WEIGHT: 'weight', SLEEP: 'sleep', INTAKE: 'intake', STEPS: 'steps' };

const hasSleep = (sleep) =>
  !!sleep && ['score', 'durationMin', 'hrv', 'hrvSdnn', 'rhr'].some((f) => num(sleep[f]) > 0);

/** @returns {{ id, label, done }[]} dans l'ordre de la journée : matin, puis soir. */
export function dayChecklist(day) {
  return [
    { id: ENTRY.WEIGHT, label: 'Poids', done: num(day?.weight) > 0 },
    { id: ENTRY.SLEEP, label: 'Sommeil', done: hasSleep(day?.sleep) },
    { id: ENTRY.INTAKE, label: 'Apport', done: num(day?.intake?.kcal) > 0 },
    { id: ENTRY.STEPS, label: 'Pas', done: num(day?.expenditure?.steps) > 0 },
  ];
}

/**
 * Ce qui manque à HIER et se rattrape encore : apport, pas et sommeil se
 * relisent dans les apps (nutrition, Santé). La pesée d'hier, elle, ne se
 * rattrape pas — la réclamer inviterait à l'inventer.
 *
 * Rien à dire sur une installation sans aucun jour saisi, ni pour l'apport
 * d'un jour en période non suivie.
 *
 * @returns {{ key: string, missing: string[] } | null}
 */
export function yesterdayGap(data, todayKey) {
  const days = data?.days ?? {};
  if (Object.keys(days).length === 0) return null;
  const key = addDays(todayKey, -1);
  const cut = isExcluded(key, data?.periods ?? [], 'nutrition');
  const missing = dayChecklist(days[key])
    .filter((item) => !item.done && item.id !== ENTRY.WEIGHT && !(cut && item.id === ENTRY.INTAKE))
    .map((item) => item.label.toLowerCase());
  return missing.length > 0 ? { key, missing } : null;
}
