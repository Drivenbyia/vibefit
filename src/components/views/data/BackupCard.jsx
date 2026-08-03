import { useRef } from 'react';
import { Download, Upload, GitMerge, Check, AlertCircle } from 'lucide-react';
import { PALETTE } from '../../../constants/config.js';
import Card from '../../ui/Card.jsx';
import BackupButton from './BackupButton.jsx';

/**
 * Deux chemins d'import distincts, et c'est volontaire.
 *
 * « Restaurer » remplace les jours en bloc : c'est ce qu'on veut en
 * réinstallant un appareil. « Fusionner » ne remplit que les champs vides :
 * c'est ce qu'on veut pour un apport partiel et répété. Les confondre ferait
 * disparaître des macros saisies à la main derrière un fichier qui ne contient
 * que dépense et sommeil.
 */
export default function BackupCard({ onExport, onFileChange, onMergeChange, importStatus }) {
  const restoreInputRef = useRef(null);
  const mergeInputRef = useRef(null);

  return (
    <Card>
      <div className="vf-display" style={{ fontSize: 11, color: PALETTE.muted, letterSpacing: '0.1em', marginBottom: 12 }}>
        BACKUP
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <BackupButton filled icon={Download} label="Exporter en JSON" onClick={onExport} />
        <BackupButton
          icon={Upload}
          label="Restaurer une sauvegarde"
          hint="Remplace les jours du fichier"
          onClick={() => restoreInputRef.current?.click()}
        />
        <BackupButton
          icon={GitMerge}
          label="Fusionner des données"
          hint="Ne remplit que les champs vides"
          onClick={() => mergeInputRef.current?.click()}
        />
      </div>

      <input ref={restoreInputRef} type="file" accept="application/json" onChange={onFileChange} style={{ display: 'none' }} />
      <input ref={mergeInputRef} type="file" accept="application/json" onChange={onMergeChange} style={{ display: 'none' }} />

      {importStatus && (
        <div
          style={{
            marginTop: 10, padding: 10, borderRadius: 12,
            background: importStatus.ok ? PALETTE.deepSoft : PALETTE.alertSoft,
            color: importStatus.ok ? PALETTE.deep : PALETTE.alert,
            fontSize: 12, display: 'flex', gap: 8, alignItems: 'center',
          }}
        >
          {importStatus.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          {importStatus.msg}
        </div>
      )}
    </Card>
  );
}
