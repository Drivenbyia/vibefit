import { useCallback } from 'react';
import { parseHealthImport } from '../utils/healthImport.js';
import { mergeDays } from '../utils/backupUtils.js';
import { toKey } from '../utils/dateUtils.js';
import { useTransientValue } from './useTransientValue.js';

/**
 * Bouton « Importer depuis Santé » : lit le presse-papier rempli par le
 * raccourci iOS et fusionne le jour sans rien écraser (`mergeDays`).
 */
export function useHealthImport(days, setData) {
  const [status, setStatus] = useTransientValue(5000);

  const importFromClipboard = useCallback(async () => {
    let text;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      setStatus({ ok: false, msg: 'Lecture du presse-papier refusée — appuie sur « Coller » quand l’iPhone le demande.' });
      return;
    }
    try {
      const { key, day, fields } = parseHealthImport(text, toKey(new Date()));
      // Fusion calculée hors du setData : l'updater reste pur.
      const { days: merged, fieldsFilled, added } = mergeDays(days, { [key]: day });
      setData((prev) => ({ ...prev, days: merged }));
      const date = `${key.slice(8, 10)}/${key.slice(5, 7)}`;
      const filled = added > 0 ? fields.length : fieldsFilled;
      setStatus({
        ok: true,
        msg: filled > 0
          ? `${date} : ${filled} valeur(s) importée(s), saisies existantes conservées`
          : `${date} : tout était déjà rempli, rien n’a été écrasé`,
      });
    } catch (err) {
      setStatus({ ok: false, msg: `Import impossible : ${err.message}.` });
    }
  }, [days, setData, setStatus]);

  return { status, importFromClipboard };
}
