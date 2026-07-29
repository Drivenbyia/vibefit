import { DEFAULT_STEPS_TARGET } from '../constants/config.js';
import { DEFAULT_TDEE, DEFAULT_TARGETS } from '../utils/presetUtils.js';
import { exportBackup, importBackup } from '../utils/backupUtils.js';
import { useTransientValue } from './useTransientValue.js';

/**
 * Logique métier de la vue Données : export JSON, import avec restauration
 * des réglages, et reset complet vers un state cohérent.
 */
export function useBackupManager(data, setData) {
  const [importStatus, setImportStatus] = useTransientValue(3000);

  const handleExport = () => exportBackup(data);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm('Êtes-vous sûr de vouloir écraser vos données actuelles ?')) {
      e.target.value = '';
      return;
    }
    importBackup(
      file,
      (parsed) => {
        try {
          if (!parsed.days || typeof parsed.days !== 'object') {
            throw new Error('Format invalide');
          }
          // Restaure aussi les réglages présents dans le backup (targets, preset,
          // baseTDEE, pas) — sinon ils sont perdus en silence sur un nouvel appareil.
          setData((prev) => ({
            ...prev,
            days: { ...prev.days, ...parsed.days },
            ...(parsed.targets && typeof parsed.targets === 'object' ? { targets: parsed.targets } : {}),
            ...(typeof parsed.presetId === 'string' ? { presetId: parsed.presetId } : {}),
            ...(typeof parsed.stepsTarget === 'number' ? { stepsTarget: parsed.stepsTarget } : {}),
            ...(typeof parsed.baseTDEE === 'number' ? { baseTDEE: parsed.baseTDEE } : {}),
          }));
          setImportStatus({ ok: true, msg: `Importé ${Object.keys(parsed.days).length} jour(s)` });
        } catch (err) {
          setImportStatus({ ok: false, msg: 'Fichier invalide : ' + err.message });
        }
      },
      (err) => {
        setImportStatus({ ok: false, msg: 'Fichier invalide : ' + err.message });
      },
    );
    e.target.value = '';
  };

  const reset = () => {
    if (confirm('Effacer TOUTES les données ? Cette action est irréversible.')) {
      // Reset complet vers un state cohérent — un objet partiel ({ days: {} })
      // priverait Header/TodayView de `targets` et ferait crasher le render.
      setData({
        days: {},
        targets: DEFAULT_TARGETS,
        stepsTarget: DEFAULT_STEPS_TARGET,
        presetId: 'maintenance',
        baseTDEE: DEFAULT_TDEE,
      });
    }
  };

  return { importStatus, handleExport, handleFileChange, reset };
}
