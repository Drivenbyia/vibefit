export default function FontStyles() {
  return (
    <style>{`
      /* ═══ Les 5 rôles typographiques — voir DESIGN.md §2 ═══
         Les @font-face vivent dans src/styles/fonts.css (auto-hébergés) : ici
         on ne déclare que l'affectation des rôles.

         .vf-gothic   UnifrakturCook — blackletter cérémoniel. L'ADN de LA.
         .vf-hero     Anton          — gros chiffres, poster condensé.
         .vf-display  Archivo Black  — capitales tracées, flocage de maillot.
         .vf-body     Barlow         — tout le texte lisible.
         .vf-mono     Azeret Mono    — données tabulaires.

         Anton et Archivo Black n'ont QU'UNE graisse réelle (400). Ne jamais
         leur passer un fontWeight inline : le navigateur synthétiserait un
         faux gras par-dessus une fonte déjà noire, ce qui bave. Les deux
         classes forcent donc font-weight: 400 — et comme un style inline
         gagne toujours sur une classe, la règle est de NE PAS écrire de
         fontWeight sur un élément portant .vf-hero ou .vf-display. */

      /* Blackletter : casse mixte obligatoire, ≥16px, chaînes courtes.
         En capitales c'est illisible (« VIBEFIT » en textura est un mur), en
         texte courant c'est pire. Trois emplacements autorisés seulement :
         le wordmark, le nom de preset, la date de semaine. */
      .vf-gothic {
        font-family: 'UnifrakturCook', serif;
        font-weight: 700;
        text-transform: none;
        letter-spacing: 0.01em;
      }

      .vf-hero {
        font-family: 'Anton', sans-serif;
        font-weight: 400;
        text-transform: uppercase;
        letter-spacing: 0.01em;
      }

      .vf-display {
        font-family: 'Archivo Black', sans-serif;
        font-weight: 400;
        letter-spacing: 0.02em;
      }

      .vf-body { font-family: 'Barlow', sans-serif; }
      .vf-mono { font-family: 'Azeret Mono', ui-monospace, monospace; }
      .vf-tabular { font-variant-numeric: tabular-nums; }

      /* Lettrage chromé — la plaque de club lowrider, le lettrage d'album
         West Coast. Dégradé argent clippé sur le texte. Le fallback compte :
         sans @supports, un navigateur sans background-clip:text afficherait
         du texte transparent, donc invisible. La couleur pleine reste la
         valeur par défaut et n'est retirée que si le clipping est supporté. */
      .vf-chrome {
        color: #EFE7DC;
      }
      @supports ((background-clip: text) or (-webkit-background-clip: text)) {
        .vf-chrome {
          background-image: linear-gradient(180deg, #FFFFFF 0%, #E6DED2 38%, #9C93A8 62%, #FFF6E8 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
      }

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
