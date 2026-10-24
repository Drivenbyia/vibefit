import { useCallback } from 'react';
import { exportBackup } from '../utils/backupUtils.js';

/**
 * Export JSON + mémorisation de sa date (`lastBackupAt`).
 *
 * Partagé par la carte de rappel d'Aujourd'hui et l'onglet Données : un seul
 * chemin d'export, donc une seule façon de dater la dernière sauvegarde.
 * Le fichier porte la même date que le state, et la contient déjà.
 *
 * Limite assumée : on date l'export LANCÉ. Si le téléchargement est annulé
 * dans la feuille de partage iOS, l'app ne peut pas le savoir.
 */
export function useBackupExport(data, setData) {
  return useCallback(() => {
    const now = new Date();
    const lastBackupAt = now.toISOString();
    exportBackup({ ...data, lastBackupAt }, now);
    setData((prev) => ({ ...prev, lastBackupAt }));
  }, [data, setData]);
}
