import { PALETTE } from '../../../constants/config.js';
import { ddmm, fmtKg, fmtCm, fmtGap } from '../../../utils/longTrendCopy.js';

const cell = { padding: '4px 6px', textAlign: 'right', whiteSpace: 'nowrap' };

/** Vue tabulaire des mêmes valeurs — l'équivalent lisible sans le tracé. */
export default function LongTrendTable({ weeks }) {
  return (
    <details style={{ marginTop: 10 }}>
      <summary className="vf-body" style={{ fontSize: 12, color: PALETTE.muted, cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>
        Valeurs semaine par semaine
      </summary>
      <table className="vf-mono vf-tabular" style={{ width: '100%', fontSize: 11, color: PALETTE.ink, borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: PALETTE.muted }}>
            <th style={{ ...cell, textAlign: 'left' }}>Semaine</th>
            <th style={cell}>Poids</th>
            <th style={cell}>Taille</th>
            <th style={cell}>Écart</th>
          </tr>
        </thead>
        <tbody>
          {[...weeks].reverse().map((w) => (
            <tr key={w.weekStart} style={{ borderTop: `1px solid ${PALETTE.line}` }}>
              <td style={{ ...cell, textAlign: 'left' }}>{ddmm(w.weekStart)}</td>
              {w.untracked
                ? <td colSpan={3} style={{ ...cell, color: PALETTE.muted }}>non suivie</td>
                : <>
                  <td style={cell}>{fmtKg(w.weight)}</td>
                  <td style={cell}>{fmtCm(w.waist)}</td>
                  <td style={cell}>{fmtGap(w.gapPerDay)}</td>
                </>}
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
