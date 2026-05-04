import { Flame, Activity, Target, Database } from 'lucide-react';
import { PALETTE } from '../../constants/config.js';

export default function BottomNav({ tab, setTab }) {
  const items = [
    { id: 'today', label: 'Jour', Icon: Flame },
    { id: 'week', label: 'Semaine', Icon: Activity },
    { id: 'targets', label: 'Cibles', Icon: Target },
    { id: 'data', label: 'Données', Icon: Database },
  ];
  return (
    <div
      style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: `1px solid ${PALETTE.line}`,
        padding: '8px 8px max(8px, env(safe-area-inset-bottom))',
        display: 'flex', justifyContent: 'space-around',
        zIndex: 100,
        boxShadow: '0 -4px 14px rgba(0,0,0,0.04)',
      }}
    >
      {items.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, padding: '8px 4px',
              background: 'transparent', border: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              color: active ? PALETTE.ink : PALETTE.muted,
              cursor: 'pointer',
            }}
          >
            <Icon size={22} strokeWidth={active ? 2.4 : 1.8} />
            <span
              className="vf-body"
              style={{
                fontSize: 10, fontWeight: active ? 700 : 500,
                letterSpacing: '0.04em',
              }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
