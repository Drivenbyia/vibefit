import { PALETTE } from '../../../constants/config.js';

/**
 * Bouton d'action de la carte Backup — plein (action principale) ou contour.
 *
 * Extrait de `BackupCard` quand un troisième bouton l'a fait dépasser la règle
 * des 80 lignes. Purement présentationnel : aucune logique de fichier ici.
 */
export default function BackupButton({ icon: Icon, label, hint, onClick, filled = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: hint ? '10px 14px' : '14px',
        background: filled ? PALETTE.ink : PALETTE.bg,
        color: filled ? PALETTE.inkSoft : PALETTE.ink,
        border: filled ? 'none' : `1px solid ${PALETTE.line}`,
        borderRadius: 12,
        cursor: 'pointer',
        minHeight: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        textAlign: 'left',
      }}
      className="vf-body"
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontWeight: 700, fontSize: 14 }}>{label}</span>
        {hint && (
          <span style={{ fontSize: 11, fontWeight: 400, color: filled ? PALETTE.inkSoft : PALETTE.muted }}>
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}
