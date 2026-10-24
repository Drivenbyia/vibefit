import { memo } from 'react';
import { Download } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import { backupAgeLabel } from '../../../utils/backupUtils.js';
import Card from '../../ui/Card.jsx';

/**
 * Rappel de sauvegarde, sur le jour courant seulement, quand le dernier export
 * dépasse le délai (ou n'a jamais eu lieu). Les données n'existent que sur cet
 * appareil : un rappel qui attend dans l'onglet Données ne protège personne.
 *
 * `warn` et non `alert` : une sauvegarde en retard est un manque, pas un
 * dépassement (DESIGN.md, règle warn/alert). Un tap exporte directement.
 */
function BackupReminderCard({ status, onExport }) {
  const title = status.never ? 'Aucune sauvegarde' : `Dernière sauvegarde ${backupAgeLabel(status)}`;
  return (
    <Card style={{ background: PALETTE.warnSoft, borderColor: PALETTE.warn }}>
      <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.warn, marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: PALETTE.ink, lineHeight: 1.5, marginBottom: 10 }}>
        Tes données n'existent que sur cet appareil. Exporte le JSON et garde-le
        hors du téléphone (Fichiers iCloud, mail…).
      </div>
      <button
        type="button"
        onClick={onExport}
        className="vf-body"
        style={{
          width: '100%', minHeight: 44, padding: '10px 14px', borderRadius: 12,
          background: PALETTE.warn, color: PALETTE.inkSoft, border: 'none',
          fontWeight: 700, fontSize: 14, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Download size={18} />
        Exporter maintenant
      </button>
    </Card>
  );
}

export default memo(BackupReminderCard);
