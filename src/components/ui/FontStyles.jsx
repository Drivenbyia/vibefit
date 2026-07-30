export default function FontStyles() {
  return (
    <style>{`
      /* Les rôles typographiques de la direction — voir DESIGN.md §2.
         Les @font-face vivent dans src/styles/fonts.css (auto-hébergés) : ici
         on ne déclare que l'affectation des rôles.
         .vf-hero (Anton) est réservé aux GROS chiffres et au wordmark : une
         fonte poster condensée à 800% de graisse perçue, illisible passé
         3-4 mots. .vf-display (Archivo) reste le display courant — titres de
         carte, labels d'écran — là où Anton casserait la lecture. */
      .vf-hero { font-family: 'Anton', sans-serif; text-transform: uppercase; letter-spacing: 0.01em; }
      .vf-display { font-family: 'Archivo', sans-serif; letter-spacing: -0.02em; }
      .vf-body { font-family: 'IBM Plex Sans', sans-serif; }
      .vf-mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
      .vf-tabular { font-variant-numeric: tabular-nums; }
      .vf-app * { box-sizing: border-box; }
      .vf-no-spin::-webkit-outer-spin-button,
      .vf-no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      .vf-no-spin { -moz-appearance: textfield; }
      .vf-pulse { animation: vfpulse 2s ease-in-out infinite; }
      @keyframes vfpulse {
        0%, 100% { opacity: 1; } 50% { opacity: 0.55; }
      }
      .vf-fadein { animation: vffadein 200ms ease-out; }
      @keyframes vffadein {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  );
}
