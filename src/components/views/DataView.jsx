import { useBackupManager } from '../../hooks/useBackupManager.js';
import BackupCard from './data/BackupCard.jsx';
import { StatusCard, DangerCard, BackupHintCard } from './data/DataInfoCards.jsx';

export default function DataView({ data, setData }) {
  const { importStatus, handleExport, handleFileChange, handleMergeChange, reset } =
    useBackupManager(data, setData);
  const dayCount = Object.keys(data.days).length;

  return (
    <div style={{ padding: '14px 14px 100px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <StatusCard dayCount={dayCount} />
      <BackupCard
        onExport={handleExport}
        onFileChange={handleFileChange}
        onMergeChange={handleMergeChange}
        importStatus={importStatus}
      />
      <DangerCard onReset={reset} />
      <BackupHintCard />
    </div>
  );
}
