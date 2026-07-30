import { useState, useEffect, useRef } from 'react';
import { PALETTE } from '../../constants/config.js';

/**
 * Input numérique avec état local pour une frappe fluide.
 *
 * Deux modes :
 * - Immédiat (pas de `onBlur`) : onChange est appelé à chaque frappe — comportement original.
 * - Différé (`onBlur` fourni)  : seul onBlur est appelé à la sortie du champ.
 *   Le state global n'est pas pollué par les valeurs intermédiaires de frappe.
 *
 * Dans les deux modes, la valeur parente (`value`) est resynchronisée dans le champ
 * uniquement quand l'input n'est pas focusé (ex: clic sur un preset).
 */
export default function NumberInput({ value, onChange, onBlur: onBlurProp, placeholder, suffix, min = 0 }) {
  const [localValue, setLocalValue] = useState(value != null ? String(value) : '');
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(value != null ? String(value) : '');
    }
  }, [value]);

  const handleChange = (e) => {
    setLocalValue(e.target.value);
    if (!onBlurProp && onChange) onChange(e.target.value);
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  const handleBlur = (e) => {
    isFocused.current = false;
    if (onBlurProp) onBlurProp(e.target.value);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: PALETTE.paper,
        border: `1px solid ${PALETTE.line}`,
        borderRadius: 3,
        // Le padding vertical vit sur l'<input>, pas ici : sinon le champ
        // PARAÎT faire 45 px alors que la cible tactile réelle n'en fait que 25,
        // et taper la marge ne focalise rien. Cf. contrainte ≥44px (DESIGN.md).
        padding: '0 12px',
        gap: 6,
      }}
    >
      <input
        type="number"
        inputMode="decimal"
        min={min}
        value={localValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className="vf-no-spin vf-tabular vf-body"
        style={{
          flex: 1,
          background: 'transparent',
          border: 'none',
          outline: 'none',
          padding: '11px 0',
          minHeight: 44,
          fontSize: 18,
          fontWeight: 600,
          color: PALETTE.ink,
          width: '100%',
          minWidth: 0,
        }}
      />
      {suffix && (
        <span className="vf-mono" style={{ fontSize: 12, color: PALETTE.muted }}>
          {suffix}
        </span>
      )}
    </div>
  );
}
