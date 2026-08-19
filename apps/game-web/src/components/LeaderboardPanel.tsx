import { useState, useEffect, useRef, useCallback } from 'react';
import type { Ranking } from '../services/socket';
import { RankingCard } from './RankingCard';
import styles from './LeaderboardPanel.module.css';

interface LeaderboardPanelProps {
  rankings: Ranking[];
  currentUsername: string;
}

export function LeaderboardPanel({ rankings, currentUsername }: LeaderboardPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [rankChangedMap, setRankChangedMap] = useState<Map<string, boolean>>(new Map());
  const prevRankingsRef = useRef<Map<string, number>>(new Map());
  const rankingsListRef = useRef<HTMLDivElement>(null);
  const timeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const sortedRankings = [...rankings].sort((a, b) => b.score - a.score);
  const maxScore = sortedRankings.length > 0 ? sortedRankings[0].score : 0;

  useEffect(() => {
    return () => {
      for (const timeout of timeoutsRef.current.values()) {
        clearTimeout(timeout);
      }
      timeoutsRef.current.clear();
    };
  }, []);

  const detectRankChanges = useCallback(() => {
    const newRankChangedMap = new Map<string, boolean>();
    
    sortedRankings.forEach((ranking, index) => {
      const newRank = index + 1;
      const oldRank = prevRankingsRef.current.get(ranking.username);
      
      if (oldRank !== undefined && oldRank !== newRank) {
        newRankChangedMap.set(ranking.username, true);
        
        if (timeoutsRef.current.has(ranking.username)) {
          clearTimeout(timeoutsRef.current.get(ranking.username)!);
        }
        
        timeoutsRef.current.set(
          ranking.username,
          setTimeout(() => {
            setRankChangedMap((prev) => {
              const next = new Map(prev);
              next.set(ranking.username, false);
              return next;
            });
            timeoutsRef.current.delete(ranking.username);
          }, 300)
        );
      }
    });
    
    sortedRankings.forEach((ranking, index) => {
      prevRankingsRef.current.set(ranking.username, index + 1);
    });
    
    if (newRankChangedMap.size > 0) {
      setRankChangedMap((prev) => {
        const next = new Map(prev);
        for (const [key, value] of newRankChangedMap) {
          next.set(key, value);
        }
        return next;
      });
    }
  }, [sortedRankings]);

  useEffect(() => {
    detectRankChanges();
  }, [detectRankChanges]);

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

      <div className={`${styles.rankingsList} ${isCollapsed ? styles.collapsed : ''}`} ref={rankingsListRef}>
        {sortedRankings.length === 0 ? (
          <div className={styles.emptyState}>
            No rankings yet
          </div>
        ) : (
          sortedRankings.map((ranking, index) => (
            <RankingCard
              key={ranking.username}
              rank={index + 1}
              ranking={ranking}
              isCurrentPlayer={ranking.username === currentUsername}
              maxScore={maxScore}
              rankChanged={rankChangedMap.get(ranking.username) || false}
            />
          ))
        )}
      </div>
    </div>
  );
}
