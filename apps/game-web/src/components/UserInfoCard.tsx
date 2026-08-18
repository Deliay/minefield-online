import React, { useState } from 'react';
import type { User } from '../services/socket';
import styles from './UserInfoCard.module.css';

interface UserInfoCardProps {
  user: User;
  onSetName: (name: string) => void;
  onLogout: () => void;
}

export function UserInfoCard({ user, onSetName, onLogout }: UserInfoCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(user.displayName || user.username);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameDraft.trim()) {
      onSetName(nameDraft.trim());
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setNameDraft(user.displayName || user.username);
    setIsEditing(false);
  };

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.avatar}>
          {(user.displayName || user.username).charAt(0).toUpperCase()}
        </div>
        <div className={styles.userInfo}>
          <div className={styles.username}>
            {user.displayName || user.username}
          </div>
          <div className={styles.score}>
            <span>Score:</span>
            <span className={`${styles.scoreValue} ${styles.scorePulse}`}>
              {user.score}
            </span>
          </div>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            className={styles.nameInput}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Enter new name"
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.button} ${styles.buttonSecondary}`}
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`${styles.button} ${styles.buttonPrimary}`}
            >
              Save
            </button>
          </div>
        </form>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => setIsEditing(true)}
          >
            Change Name
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={onLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
