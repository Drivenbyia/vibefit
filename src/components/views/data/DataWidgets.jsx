import { memo } from 'react';
import { Download } from 'lucide-react';
import { PALETTE, BACKUP_REMINDER_DAYS } from '../../../constants/config.js';
import { backupAgeLabel } from '../../../utils/backupUtils.js';
import { fmtInt } from '../../../utils/format.js';
import WidgetTile from '../../ui/WidgetTile.jsx';

const big = { fontSize: 30, lineHeight: 1 };
const sub = { fontSize: 12, color: PALETTE.muted, textTransform: 'none' };
const STORAGE = {
  pending: { label: 'Vérif…', tone: PALETTE.muted },
  persisted: { label: 'Protégé', tone: PALETTE.deep },
  denied: { label: 'Non garanti', tone: PALETTE.warn },
  unsupported: { label: 'Non garanti', tone: PALETTE.warn },
};

/** Tes données en un coup d'œil, et la sauvegarde en un appui. */
function DataWidgets({ dayCount, backup, storageStatus, onExport }) {
  const storage = STORAGE[storageStatus] ?? STORAGE.unsupported;
  const age = backup ? backupAgeLabel(backup) : 'rien à sauver';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
      <WidgetTile label="JOURS SAISIS" delay={0}>
        <span className="vf-hero vf-tabular" style={big}>{fmtInt(dayCount)}</span>
        <span style={sub}>sur cet appareil</span>
      </WidgetTile>
      <WidgetTile label="DERNIER EXPORT" missing={!!backup?.overdue} missingTone={PALETTE.warn} delay={0.05}>
        <span className="vf-hero" style={{ ...big, fontSize: 24, color: backup?.overdue ? PALETTE.warn : PALETTE.ink }}>{age}</span>
        <span style={sub}>{backup?.overdue ? 'à refaire' : 'à jour'} · rappel après {BACKUP_REMINDER_DAYS} j</span>
      </WidgetTile>
      <WidgetTile label="STOCKAGE" delay={0.1}>
        <span className="vf-hero" style={{ ...big, fontSize: 24, color: storage.tone }}>{storage.label}</span>
        <span style={sub}>par le navigateur</span>
      </WidgetTile>
      <WidgetTile label="SAUVEGARDER" onPress={onExport} delay={0.15}>
        <Download size={30} color={PALETTE.deep} aria-hidden="true" style={{ filter: `drop-shadow(0 0 6px ${PALETTE.deep})` }} />
        <span style={{ fontSize: 13, fontWeight: 700, marginTop: 'auto' }}>Exporter en JSON</span>
      </WidgetTile>
    </div>
  );
}

export default memo(DataWidgets);
