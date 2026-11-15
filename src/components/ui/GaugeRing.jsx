import { memo } from 'react';

/**
 * Petit anneau de widget : part atteinte (0 → 1), qui se dessine à l'ouverture.
 * `progress` null = rien à mesurer : piste seule. Décoratif — la valeur est
 * toujours écrite à côté, l'anneau est donc masqué aux lecteurs d'écran.
 */
function GaugeRing({ progress, color, size = 54, stroke = 7, children }) {
  const r = (size - stroke) / 2;
  return (
    <span style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'inline-block' }}>
      <svg aria-hidden="true" viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ transform: 'rotate(-90deg)', display: 'block' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={`${color}2E`} strokeWidth={stroke} />
        {progress > 0 && (
          <circle
            className="vf-ring" cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - Math.min(1, progress) * 100}
            style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
          />
        )}
      </svg>
      {children && (
        <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{children}</span>
      )}
    </span>
  );
}

export default memo(GaugeRing);
