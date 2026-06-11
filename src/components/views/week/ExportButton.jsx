import { ClipboardCopy, Check } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';

export default function ExportButton({ copied, onExport }) {
  return (
    <button
      onClick={onExport}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        width: '100%',
        padding: '12px 16px',
        background: 'transparent',
        border: `1.5px solid ${PALETTE.line}`,
        borderRadius: 12,
        cursor: 'pointer',
        color: copied ? PALETTE.deep : PALETTE.muted,
        fontSize: 13,
        fontWeight: 700,
        letterSpacing: '0.04em',
        transition: 'color 0.2s, border-color 0.2s',
        borderColor: copied ? PALETTE.deep : PALETTE.line,
      }}
    >
      {copied
        ? <Check size={15} strokeWidth={2.5} />
        : <ClipboardCopy size={15} strokeWidth={2.5} />}
      {copied ? 'Copié !' : 'Partager au Coach'}
    </button>
  );
}
