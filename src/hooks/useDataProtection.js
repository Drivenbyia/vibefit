import { useMemo } from 'react';
import { backupStatus } from '../utils/backupUtils.js';
import { toKey } from '../utils/dateUtils.js';
import { useBackupExport } from './useBackupExport.js';
import { useStoragePersistence } from './useStoragePersistence.js';

/**
 * Tout ce qui protège les données d'un appareil sans backend : la demande de
 * stockage persistant, l'état de la dernière sauvegarde et l'export qui la
 * met à jour. Monté dans `App` pour que la demande parte au lancement, pas à
 * l'ouverture de l'onglet Données.
 *
 * L'état de sauvegarde se compte au jour RÉEL, pas au jour feuilleté.
 * `dateKey` sert de signal de réveil : `useCurrentDateKey` le fait passer au
 * lendemain quand la PWA se rouvre, ce qui réévalue l'âge de la sauvegarde.
 */
export function useDataProtection(data, setData, dateKey) {
  const storageStatus = useStoragePersistence();
  const exportBackupNow = useBackupExport(data, setData);
  const dayCount = Object.keys(data.days).length;
  const backup = useMemo(
    () => backupStatus({ lastBackupAt: data.lastBackupAt, dayCount, todayKey: toKey(new Date()) }),
    // `dateKey` n'est pas lu : c'est le signal de réveil (voir ci-dessus).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.lastBackupAt, dayCount, dateKey],
  );
  return { storageStatus, backup, exportBackupNow };
}
