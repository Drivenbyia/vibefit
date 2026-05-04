export default function FontStyles() {
  return (
    <style>{`
      .vf-display { font-family: 'Archivo', system-ui, sans-serif; letter-spacing: -0.02em; }
      .vf-body { font-family: 'Inter Tight', system-ui, sans-serif; }
      .vf-mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }
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
