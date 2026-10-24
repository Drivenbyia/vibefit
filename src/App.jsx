import { useState, useMemo, useCallback } from 'react';
import { PALETTE } from './constants/config.js';
import { useVibefitStorage } from './hooks/useVibefitStorage.js';
import { useCurrentDateKey } from './hooks/useCurrentDateKey.js';
import { useDataProtection } from './hooks/useDataProtection.js';
import { emptyDay } from './models/day.js';
import { useResolvedTargets } from './hooks/useResolvedTargets.js';
import FontStyles from './components/ui/FontStyles.jsx';
import Header from './components/layout/Header.jsx';
import BottomNav from './components/layout/BottomNav.jsx';
import TodayView from './components/views/TodayView.jsx';
import WeekView from './components/views/WeekView.jsx';
import TargetsView from './components/views/TargetsView.jsx';
import DataView from './components/views/DataView.jsx';

export default function VibeFit() {
  const [data, setData, loaded] = useVibefitStorage();
  const [dateKey, setDateKey] = useCurrentDateKey();
  const [tab, setTab] = useState('today');

  const openWeek = useCallback(() => setTab('week'), []);
  const { storageStatus, backup, exportBackupNow } = useDataProtection(data, setData, dateKey);

  const { targets, dayTargets } = useResolvedTargets(data, dateKey);

  const day = useMemo(
    () => ({ ...emptyDay(), ...(data.days[dateKey] || {}) }),
    [data.days, dateKey]
  );

  const updateDay = useCallback(
    (patch) => {
      setData((prev) => ({
        ...prev,
        days: {
          ...prev.days,
          [dateKey]: { ...emptyDay(), ...(prev.days[dateKey] || {}), ...patch },
        },
      }));
    },
    [dateKey, setData]
  );

  if (!loaded) {
    return (
      <div className="vf-app vf-body" style={{ minHeight: '100vh', background: PALETTE.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FontStyles />
        <div className="vf-pulse vf-gothic" style={{ fontSize: 34, color: PALETTE.ink, lineHeight: 1 }}>
          Vibe<span style={{ color: PALETTE.deep, textShadow: `0 0 16px ${PALETTE.deep}` }}>Fit</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="vf-app vf-body"
      style={{
        minHeight: '100vh',
        background: PALETTE.bg,
        color: PALETTE.ink,
        maxWidth: 720,
        margin: '0 auto',
        borderLeft: `1px solid ${PALETTE.line}`,
        borderRight: `1px solid ${PALETTE.line}`,
      }}
    >
      <FontStyles />
      <Header dateKey={dateKey} setDateKey={setDateKey} day={day} updateDay={updateDay} targets={dayTargets} phases={data.phases} />
      {tab === 'today' && <TodayView dateKey={dateKey} day={day} updateDay={updateDay} targets={dayTargets} stepsTarget={data.stepsTarget} data={data} onOpenWeek={openWeek} backup={backup} onExportBackup={exportBackupNow} />}
      {tab === 'week' && <WeekView dateKey={dateKey} data={data} setDateKey={setDateKey} targets={targets} stepsTarget={data.stepsTarget} />}
      {tab === 'targets' && <TargetsView data={data} setData={setData} />}
      {tab === 'data' && <DataView data={data} setData={setData} backup={backup} storageStatus={storageStatus} />}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}
