import { useBackupManager } from '../../hooks/useBackupManager.js';
import BackupCard from './data/BackupCard.jsx';
import DataWidgets from './data/DataWidgets.jsx';
import { DangerCard, BackupHintCard } from './data/DataInfoCards.jsx';

export default function DataView({ data, setData, backup, storageStatus }) {
  const { importStatus, handleExport, handleFileChange, handleMergeChange, reset } =
    useBackupManager(data, setData);
  const dayCount = Object.keys(data.days).length;

  return (
    <div style={{ padding: '14px 14px 120px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <DataWidgets dayCount={dayCount} backup={backup} storageStatus={storageStatus} onExport={handleExport} />
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
