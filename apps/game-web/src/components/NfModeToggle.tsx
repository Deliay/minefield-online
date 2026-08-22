import React from 'react';
import styles from './NfModeToggle.module.css';

interface NfModeToggleProps {
  nfMode: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const NfModeToggle: React.FC<NfModeToggleProps> = ({
  nfMode,
  onToggle,
  disabled = false,
}) => {
  return (
    <div className={styles.container}>
      <label className={styles.label}>
        <input
          type="checkbox"
          checked={nfMode}
          onChange={(e) => onToggle(e.target.checked)}
          disabled={disabled}
          className={styles.checkbox}
        />
        <span className={styles.toggle}>
          <span className={styles.slider} />
        </span>
        <span className={styles.text}>NF</span>
      </label>
    </div>
  );
};
