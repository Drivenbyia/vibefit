import { emptyDay } from '../models/day.js';

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

export function exportBackup(data) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vibefit-${new Date().toISOString().split('T')[0]}.json`;
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
