import { Moon } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import Label from '../../ui/Label.jsx';
import NumberInput from '../../ui/NumberInput.jsx';

/**
 * Saisie du sommeil relevé sur la montre : score, durée, HRV.
 *
 * Ces valeurs vivaient en texte libre dans les notes, sous des formats variables
 * (« score 71 », « score de sommeil 84 / svf 41 », « 8h16 score 88 »). Elles
 * expliquaient déjà le bruit de la série de poids, mais n'étaient exploitables
 * qu'à la lecture. Les structurer les rend analysables sans rien inventer.
 */
export default function SleepCard({ day, updateDay }) {
  const sleep = day.sleep ?? {};
  const total = parseInt(sleep.durationMin, 10);
  const hours = isNaN(total) ? '' : Math.floor(total / 60);
  const minutes = isNaN(total) ? '' : total % 60;

  const patch = (fields) => updateDay({ sleep: { ...sleep, ...fields } });
  const setDuration = (h, m) => {
    const mins = (parseInt(h, 10) || 0) * 60 + (parseInt(m, 10) || 0);
    patch({ durationMin: mins > 0 ? String(mins) : '' });
  };

  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Moon size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          SOMMEIL
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ gridColumn: 'span 2' }}>
          <Label>Score</Label>
          <NumberInput value={sleep.score ?? ''} onChange={(v) => patch({ score: v })} placeholder="ex. 85" suffix="/100" />
        </div>
        <div>
          {/* Libellés alignés sur la montre (VFC nocturne, FC au repos). Les clés
              de stockage restent `hrv` et `rhr`, termes standard côté code. */}
          <Label>VFC</Label>
          <NumberInput value={sleep.hrv ?? ''} onChange={(v) => patch({ hrv: v })} placeholder="ex. 46" suffix="ms" />
        </div>
        <div>
          <Label>FC repos</Label>
          <NumberInput value={sleep.rhr ?? ''} onChange={(v) => patch({ rhr: v })} placeholder="ex. 52" suffix="bpm" />
        </div>
        <div>
          <Label>Durée — heures</Label>
          <NumberInput value={hours} onBlur={(v) => setDuration(v, minutes)} placeholder="ex. 6" suffix="h" />
        </div>
        <div>
          <Label>Durée — minutes</Label>
          <NumberInput value={minutes} onBlur={(v) => setDuration(hours, v)} placeholder="ex. 55" suffix="min" />
        </div>
      </div>
    </Card>
  );
}
