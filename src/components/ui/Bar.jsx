import { PALETTE } from '../../constants/config.js';

// --- LA RÈGLE GRADUÉE (signature VibeFit — voir DESIGN.md) ---
// Aucune barre de progression remplie : une échelle physique, graduée, où la
// cible est une ENCOCHE et non une fin de course. L'échelle court jusqu'à 125 %
// de la cible, ce qui place l'encoche à 80 % de la largeur — dépasser reste
// donc lisible au lieu de saturer la barre.
const SCALE = 1.25;
const TARGET_AT = 100 / SCALE; // 80 % de la largeur

export default function Bar({ value, target, color, label, unit = 'g' }) {
  const scaleMax = target > 0 ? target * SCALE : 0;
  const cursor = scaleMax > 0 ? Math.min(100, (value / scaleMax) * 100) : 0;
  const over = target > 0 && value > target * 1.05;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE.muted, letterSpacing: '0.06em' }}>
          {label}
        </span>
        <span className="vf-mono vf-tabular" style={{ fontSize: 12, color: PALETTE.ink }}>
          <strong>{Math.round(value)}</strong>
          {target ? (
            <span style={{ color: PALETTE.muted }}> / {target}{unit}</span>
          ) : (
            <span style={{ color: PALETTE.muted }}>{unit}</span>
          )}
        </span>
      </div>

      <div style={{ position: 'relative', height: 15 }}>
        {/* graduations mineures, tous les 10 % de la largeur */}
        <div
          style={{
            position: 'absolute', left: 0, right: 0, bottom: 1, height: 5,
            backgroundImage: `repeating-linear-gradient(to right, ${PALETTE.tick} 0 1px, transparent 1px 10%)`,
          }}
        />
        {/* filet de base + cran de fin d'échelle */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: PALETTE.tick }} />
        <div style={{ position: 'absolute', right: 0, bottom: 1, width: 1, height: 5, background: PALETTE.tick }} />

        {/* encoche de cible : cran lourd, pleine hauteur */}
        {target > 0 && (
          <div
            style={{
              position: 'absolute', left: `${TARGET_AT}%`, bottom: 0,
              width: 2, height: 13, marginLeft: -1, background: PALETTE.ink,
            }}
          />
        )}

        {/* valeur relevée : bloc à bout droit posé sur le filet */}
        <div
          style={{
            position: 'absolute', left: 0, bottom: 1, height: 4,
            width: `${cursor}%`,
            background: over ? PALETTE.alert : color,
            transition: 'width 200ms ease',
          }}
        />
      </div>
    </div>
  );
}
