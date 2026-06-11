import { PALETTE } from '../../../constants/config.js';

export default function EnergyStat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
        {label}
      </div>
      <div className="vf-display vf-tabular" style={{ fontSize: 26, fontWeight: 900, color: PALETTE.ink, lineHeight: 1 }}>
        {value || 0}
        <span className="vf-body" style={{ fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>
          kcal
        </span>
      </div>
    </div>
  );
}
