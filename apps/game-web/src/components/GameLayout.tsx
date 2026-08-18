import React from 'react';
import styles from './GameLayout.module.css';

interface GameLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}

export function GameLayout({ children, sidebar }: GameLayoutProps) {
  return (
    <div className={styles.container}>
      <div className={styles.background} />
      <div className={styles.content}>
        <div className={styles.main}>
          <div className={styles.canvasContainer}>
            {children}
          </div>
        </div>
        {sidebar && (
          <div className={styles.sidebar}>
            {sidebar}
          </div>
        )}
      </div>
    </div>
  );
}
