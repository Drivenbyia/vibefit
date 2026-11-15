import { useCallback } from 'react';
import { parseHealthImport, applyHealthImport } from '../utils/healthImport.js';
import { emptyDay } from '../models/day.js';
import { toKey } from '../utils/dateUtils.js';
import { useTransientValue } from './useTransientValue.js';

/**
 * Bouton « Importer depuis Santé » : lit le presse-papier rempli par le
 * raccourci iOS. L'import met à jour ses propres valeurs, jamais une saisie
 * manuelle (`applyHealthImport`).
 */
/**
 * Raccourcis copie un dictionnaire comme un FICHIER JSON, pas comme du texte :
 * `readText()` renvoie alors vide. On parcourt donc les types du presse-papier
 * (texte d'abord, puis tout type « json ») avant de retomber sur `readText()`.
 */
async function readClipboardText() {
  if (navigator.clipboard?.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const type = item.types.find((t) => t === 'text/plain')
          ?? item.types.find((t) => t.includes('json'));
        if (type) {
          const text = await (await item.getType(type)).text();
          if (text.trim()) return text;
        }
      }
    } catch {
      // Type non lisible ou API refusée : on tente readText.
    }
  }
  return navigator.clipboard.readText();
}

export function useHealthImport(days, setData) {
  const [status, setStatus] = useTransientValue(5000);

  const importFromClipboard = useCallback(async () => {
    let text;
    try {
      text = await readClipboardText();
    } catch {
      setStatus({ ok: false, msg: 'Lecture du presse-papier refusée — appuie sur « Coller » quand l’iPhone le demande.' });
      return;
    }
    try {
      const { key, day: partial } = parseHealthImport(text, toKey(new Date()));
      // Calcul hors du setData : l'updater reste pur.
      const { day, written, kept } = applyHealthImport(days[key], partial, emptyDay());
      setData((prev) => ({ ...prev, days: { ...prev.days, [key]: day } }));
      const date = `${key.slice(8, 10)}/${key.slice(5, 7)}`;
      const keptMsg = kept.length ? `, ${kept.length} saisie(s) manuelle(s) conservée(s)` : '';
      setStatus({
        ok: true,
        msg: written.length > 0
          ? `${date} : ${written.length} valeur(s) importée(s) ou mise(s) à jour${keptMsg}`
          : `${date} : rien de nouveau${keptMsg}`,
      });
    } catch (err) {
      setStatus({ ok: false, msg: `Import impossible : ${err.message}.` });
    }
  }, [days, setData, setStatus]);

  return { status, importFromClipboard };
}
