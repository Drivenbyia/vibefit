import { PALETTE } from '../../../constants/config.js';

export default function EnergyStat({ label, value }) {
  return (
    <div>
      <div className="vf-display" style={{ fontSize: 10, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 4 }}>
        {label}
      </div>
      <div className="vf-hero vf-tabular" style={{ fontSize: 26, color: PALETTE.ink, lineHeight: 1 }}>
        {value || 0}
        <span className="vf-body" style={{ fontSize: 12, fontWeight: 500, color: PALETTE.muted, marginLeft: 4 }}>
          kcal
        </span>
      </div>
    </div>
  );
}
