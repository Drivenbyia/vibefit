import { FileText } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import Label from '../../ui/Label.jsx';

export default function NotesCard({ day, updateDay }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <FileText size={14} color={PALETTE.muted} />
        <Label noMargin>Note du jour</Label>
      </div>
      <textarea
        value={day.notes}
        onChange={(e) => updateDay({ notes: e.target.value })}
        placeholder="Sensations, faim, sommeil, chantier, écarts..."
        className="vf-body"
        style={{
          width: '100%',
          minHeight: 60,
          padding: 10,
          background: PALETTE.bg,
          border: `1px solid ${PALETTE.line}`,
          borderRadius: 12,
          outline: 'none',
          resize: 'vertical',
          fontSize: 13,
          color: PALETTE.ink,
        }}
      />
    </Card>
  );
}
