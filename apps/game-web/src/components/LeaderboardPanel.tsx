import React, { useState } from 'react';
import type { Ranking } from '../services/socket';
import { RankingCard } from './RankingCard';
import styles from './LeaderboardPanel.module.css';

interface LeaderboardPanelProps {
  rankings: Ranking[];
  currentUsername: string;
}

export function LeaderboardPanel({ rankings, currentUsername }: LeaderboardPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const sortedRankings = [...rankings].sort((a, b) => b.score - a.score);
  const displayRankings = sortedRankings.filter((r) => r.username !== currentUsername);

  return (
    <div className={`${styles.panel} ${isCollapsed ? styles.collapsed : ''}`}>
      <button
        className={styles.header}
        onClick={() => setIsCollapsed(!isCollapsed)}
        type="button"
      >
        <div className={styles.headerContent}>
          <h3 className={styles.title}>Leaderboard</h3>
          <span className={`${styles.toggleIcon} ${isCollapsed ? styles.collapsed : ''}`}>
            ▼
          </span>
        </div>
      </button>

      <div className={`${styles.rankingsList} ${isCollapsed ? styles.collapsed : ''}`}>
        {displayRankings.length === 0 ? (
          <div className={styles.emptyState}>
            No rankings yet
          </div>
        ) : (
          displayRankings.map((ranking, index) => (
            <RankingCard
              key={ranking.username}
              rank={index + 1}
              ranking={ranking}
              isCurrentPlayer={ranking.username === currentUsername}
            />
          ))
        )}
      </div>
    </div>
  );
}