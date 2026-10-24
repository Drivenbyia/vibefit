import { emptyDay } from '../models/day.js';
import { isValidInstant } from '../models/protocol.js';
import { toKey } from './dateUtils.js';
import { BACKUP_REMINDER_DAYS } from '../constants/config.js';

const isBlank = (v) => v == null || v === '';
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Fusion NON DESTRUCTIVE d'un jour : ne remplit que ce qui est vide.
 *
 * La restauration de sauvegarde remplace un jour en bloc, ce qui est correct
 * pour son usage (réinstaller un appareil). Appliquée à un import RÉCURRENT —
 * une synchronisation qui n'apporte que dépense, pas et sommeil — la même
 * opération effacerait en silence les macros déjà saisies à la main.
 *
 * Une valeur saisie n'est donc jamais écrasée : en cas de désaccord entre la
 * source importée et la saisie manuelle, c'est la saisie qui gagne. C'est le
 * seul arbitrage sûr — l'utilisateur peut corriger une valeur qu'il voit,
 * jamais en retrouver une qu'il n'a pas vu disparaître.
 */
function fillBlanks(existing, incoming, counter) {
  const out = { ...existing };

  for (const [key, incomingValue] of Object.entries(incoming ?? {})) {
    const currentValue = out[key];

    if (isPlainObject(incomingValue) && isPlainObject(currentValue)) {
      out[key] = fillBlanks(currentValue, incomingValue, counter);
    } else if (isBlank(currentValue) && !isBlank(incomingValue)) {
      out[key] = incomingValue;
      counter.fields += 1;
    }
  }

  return out;
}

/**
 * Fusionne des jours importés dans les jours existants.
 *
 * Un jour absent est créé sur la forme d'`emptyDay()` — jamais recopié tel
 * quel : un objet partiel priverait les vues des clés qu'elles déstructurent.
 *
 * @returns {{days: Object, added: number, enriched: number, fieldsFilled: number}}
 */
export function mergeDays(prevDays = {}, incomingDays = {}) {
  const days = { ...prevDays };
  let added = 0;
  let enriched = 0;
  let fieldsFilled = 0;

  for (const [key, incomingDay] of Object.entries(incomingDays)) {
    if (!isPlainObject(incomingDay)) continue;

    if (!days[key]) {
      days[key] = fillBlanks(emptyDay(), incomingDay, { fields: 0 });
      added += 1;
      continue;
    }

    const counter = { fields: 0 };
    const merged = fillBlanks(days[key], incomingDay, counter);
    if (counter.fields > 0) {
      days[key] = merged;
      enriched += 1;
      fieldsFilled += counter.fields;
    }
  }

  return { days, added, enriched, fieldsFilled };
}

/**
 * Nom du fichier de sauvegarde, horodaté à la minute en heure LOCALE :
 * deux exports du même jour (avant / après une modification) ne doivent pas
 * porter le même nom. Les « : » sont exclus, interdits dans un nom de fichier.
 */
export function backupFileName(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `vibefit-${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}` +
    `_${p(date.getHours())}h${p(date.getMinutes())}.json`;
}

export function exportBackup(data, date = new Date()) {
  // `exportedAt` date le FICHIER sans se fier à son nom. La restauration ne
  // le recopie pas tel quel : elle ne s'en sert que pour `lastBackupAt`.
  const jsonString = JSON.stringify({ ...data, exportedAt: date.toISOString() }, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName(date);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function importBackup(file, onSuccess, onError) {
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const parsed = JSON.parse(ev.target.result);
      onSuccess(parsed);
    } catch (err) {
      onError(err);
    }
  };
  reader.readAsText(file);
}

/**
 * Le plus récent de deux horodatages valides (ou null).
 *
 * Restaurer un fichier prouve qu'une sauvegarde existe à sa date : la date du
 * dernier export avance jusqu'à `exportedAt`, sans jamais reculer — restaurer
 * un vieux fichier ne doit pas faire oublier un export plus récent.
 */
export function latestInstant(a, b) {
  const valid = [a, b].filter(isValidInstant);
  if (valid.length === 0) return null;
  return valid.reduce((x, y) => (Date.parse(y) > Date.parse(x) ? y : x));
}

const DAY_MS = 86400000;

/**
 * État de la sauvegarde, compté en jours CALENDAIRES locaux.
 *
 * Calculé depuis `todayKey` et non depuis l'heure courante : la fonction reste
 * pure, et un export fait à 23 h compte « il y a 1 jour » le lendemain matin.
 * Rien à protéger tant qu'aucun jour n'est saisi : `null`.
 */
export function backupStatus({ lastBackupAt, dayCount, todayKey }) {
  if (!dayCount) return null;
  if (!isValidInstant(lastBackupAt)) {
    return { never: true, ageDays: null, lastKey: null, overdue: true };
  }
  const lastKey = toKey(lastBackupAt);
  const ageDays = Math.max(0, Math.round(
    (Date.parse(todayKey + 'T12:00:00') - Date.parse(lastKey + 'T12:00:00')) / DAY_MS,
  ));
  return { never: false, ageDays, lastKey, overdue: ageDays > BACKUP_REMINDER_DAYS };
}

/** « aujourd'hui » / « hier » / « il y a 9 jours » / « jamais ». */
export function backupAgeLabel(status) {
  if (!status) return '';
  if (status.never) return 'jamais';
  if (status.ageDays === 0) return "aujourd'hui";
  if (status.ageDays === 1) return 'hier';
  return `il y a ${status.ageDays} jours`;
}
