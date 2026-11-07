import { User } from 'lucide-react';
import { PALETTE, PROFILE_SEXES, TDEE_MAX_PLAUSIBLE_KCAL } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import NumberInput from '../../ui/NumberInput.jsx';

const fr = (n) => Math.round(n).toLocaleString('fr-FR');
const FIELD = { flex: 1, display: 'flex', flexDirection: 'column', gap: 4 };
const LABEL = { fontSize: 11, color: PALETTE.muted };

/**
 * Profil physiologique — sexe, année de naissance, taille. Sert au seul
 * garde-fou du TDEE mesuré : métabolisme de base Mifflin-St Jeor au poids
 * lissé courant, et le plancher qui en découle.
 */
export default function ProfileCard({ sex, birthYear, heightCm, bmr, minKcal, lowKcal, onFieldChange }) {
  return (
    <Card>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <User size={16} color={PALETTE.deep} />
        <div className="vf-body" style={{ fontSize: 14, fontWeight: 700, color: PALETTE.ink, letterSpacing: '0.02em' }}>
          PROFIL
        </div>
      </div>
      <div role="radiogroup" aria-label="Sexe" style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        {Object.entries(PROFILE_SEXES).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={sex === id}
            onClick={() => onFieldChange('sex', id)}
            className="vf-body"
            style={{
              flex: 1, minHeight: 44, borderRadius: 12, cursor: 'pointer',
              border: `1px solid ${sex === id ? PALETTE.ink : PALETTE.line}`,
              background: sex === id ? PALETTE.ink : 'transparent',
              color: sex === id ? PALETTE.inkSoft : PALETTE.ink,
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <label style={FIELD}>
          <span style={LABEL}>Année de naissance</span>
          <NumberInput value={birthYear} onBlur={(v) => onFieldChange('birthYear', v)} placeholder="1991" />
        </label>
        <label style={FIELD}>
          <span style={LABEL}>Taille</span>
          <NumberInput value={heightCm} onBlur={(v) => onFieldChange('heightCm', v)} placeholder="175" suffix="cm" />
        </label>
      </div>
      <div style={{ fontSize: 11, color: PALETTE.muted, marginTop: 10, lineHeight: 1.5 }}>
        {bmr !== null
          ? `Métabolisme de base ≈ ${fr(bmr)} kcal (Mifflin-St Jeor, poids lissé). Un TDEE mesuré sous ${fr(minKcal)} kcal ou au-dessus de ${fr(TDEE_MAX_PLAUSIBLE_KCAL)} kcal est déclaré incohérent ; sous ${fr(lowKcal)} kcal, il est « bas — à confirmer ».`
          : 'Renseigne sexe, année de naissance et taille : sans eux, le TDEE mesuré ne peut pas être vérifié ni servir à recalibrer.'}
      </div>
    </Card>
  );
}
