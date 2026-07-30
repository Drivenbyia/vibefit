export default function FontStyles() {
  return (
    <style>{`
      /* Les 3 rôles typographiques de la direction — voir DESIGN.md.
         Les @font-face vivent dans src/styles/fonts.css (auto-hébergés) : ici
         on ne déclare que l'affectation des rôles. */
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
