import { PALETTE, BACKUP_REMINDER_DAYS } from '../../../constants/config.js';
import { backupAgeLabel } from '../../../utils/backupUtils.js';
import Card from '../../ui/Card.jsx';

const STORAGE_COPY = {
  pending: { label: 'vérification…', tone: 'muted' },
  persisted: { label: 'protégé', tone: 'deep' },
  denied: { label: 'non garanti', tone: 'warn' },
  unsupported: { label: 'non garanti', tone: 'warn' },
};

const fr = (key) => new Date(key + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

function Row({ label, value, tone }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '4px 0' }}>
      <span style={{ color: PALETTE.muted }}>{label}</span>
      <span style={{ color: PALETTE[tone], fontWeight: 700, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/**
 * Ce qui protège les données : la dernière sauvegarde et la réponse du
 * navigateur à la demande de stockage persistant. « Non garanti » n'est pas
 * une panne : le navigateur peut purger, l'export reste la vraie protection.
 */
export default function ProtectionCard({ backup, storageStatus }) {
  const storage = STORAGE_COPY[storageStatus] ?? STORAGE_COPY.unsupported;
  const backupValue = !backup
    ? 'rien à sauvegarder'
    : backup.never ? 'jamais' : `${backupAgeLabel(backup)} (${fr(backup.lastKey)})`;
  return (
    <Card>
      <div className="vf-display" style={{ fontSize: 11, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 8 }}>
        PROTECTION
      </div>
      <Row label="Dernier export" value={backupValue} tone={backup?.overdue ? 'warn' : 'ink'} />
      <Row label="Stockage du navigateur" value={storage.label} tone={storage.tone} />
      <div style={{ fontSize: 11, color: PALETTE.muted, lineHeight: 1.5, marginTop: 6 }}>
        Rappel sur Aujourd'hui au-delà de {BACKUP_REMINDER_DAYS} jours sans export.
      </div>
    </Card>
  );
}
