import type { Ranking } from '../services/socket';
import { ScoreBar } from './ScoreBar';
import styles from './RankingCard.module.css';

interface RankingCardProps {
  rank: number;
  ranking: Ranking;
  isCurrentPlayer: boolean;
  maxScore: number;
  rankChanged?: boolean;
}

export function RankingCard({ rank, ranking, isCurrentPlayer, maxScore, rankChanged }: RankingCardProps) {
  const getRankClass = (rank: number) => {
    if (rank === 1) return styles.first;
    if (rank === 2) return styles.second;
    if (rank === 3) return styles.third;
    return '';
  };

  const getBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return null;
  };

  const badge = getBadge(rank);

  return (
    <div
      className={`${styles.card} ${isCurrentPlayer ? styles.currentPlayer : ''} ${rankChanged ? styles.rankChanged : ''}`}
      data-rank={rank}
    >
      <div className={`${styles.rank} ${getRankClass(rank)}`}>
        {rank}
      </div>
      
      <div className={styles.playerInfo}>
        <div className={styles.playerName}>
          {ranking.displayName || ranking.username}
        </div>
        <ScoreBar score={ranking.score} maxScore={maxScore} />
      </div>

      {badge && (
        <div className={styles.badge}>
          {badge}
        </div>
      )}

      {ranking.nfMode && (
        <div className={styles.nfBadge}>
          NF
        </div>
      )}
    </div>
  );
}
