import { PALETTE, glow } from '../../constants/config.js';

// --- Piste lumineuse (signature VibeFit — voir DESIGN.md) ---
// Un remplissage plein, à bout rond, qui GLOWE dans sa propre couleur — jamais
// une barre plate. La cible reste un repère (petit marqueur lumineux), pas une
// fin de course : l'échelle court à 125 % de la cible pour que dépasser reste
// lisible au lieu de saturer la piste.
const SCALE = 1.25;
const TARGET_AT = 100 / SCALE; // 80 % de la largeur

export default function Bar({ value, target, color, label, unit = 'g' }) {
  const scaleMax = target > 0 ? target * SCALE : 0;
  const cursor = scaleMax > 0 ? Math.min(100, (value / scaleMax) * 100) : 0;
  const over = target > 0 && value > target * 1.05;
  const fillColor = over ? PALETTE.alert : color;

  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
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

      <div style={{ position: 'relative', height: 8 }}>
        {/* piste */}
        <div style={{ position: 'absolute', inset: 0, background: PALETTE.surfaceRaised, borderRadius: 999 }} />

        {/* remplissage lumineux */}
        <div
          style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${Math.max(cursor, cursor > 0 ? 3 : 0)}%`,
            background: fillColor,
            borderRadius: 999,
            boxShadow: cursor > 0 ? glow(fillColor, 10) : 'none',
            transition: 'width 250ms ease',
          }}
        />

        {/* marqueur de cible : encoche lumineuse traversant la piste */}
        {target > 0 && (
          <div
            style={{
              position: 'absolute', left: `${TARGET_AT}%`, top: -2, bottom: -2,
              width: 3, marginLeft: -1.5, borderRadius: 2,
              background: PALETTE.ink,
              boxShadow: `0 0 6px ${PALETTE.bg}`,
            }}
          />
        )}
      </div>
    </div>
  );
}
