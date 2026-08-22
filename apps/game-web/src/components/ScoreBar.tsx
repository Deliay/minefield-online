import styles from './ScoreBar.module.css';

interface ScoreBarProps {
  score: number;
  maxScore: number;
  delta?: number;
}

export function ScoreBar({ score, maxScore, delta }: ScoreBarProps) {
  const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;
  const isPositive = delta !== undefined && delta > 0;
  const isNegative = delta !== undefined && delta < 0;

  const getBarClass = () => {
    if (isPositive) return styles.positive;
    if (isNegative) return styles.negative;
    return styles.neutral;
  };

  return (
    <div className={styles.container}>
      <div className={styles.label}>
        <span className={styles.value}>
          {score.toLocaleString()}
          {delta !== undefined && (
            <span className={`${styles.delta} ${isPositive ? styles.positive : isNegative ? styles.negative : ''}`}>
              {isPositive ? '+' : ''}{delta}
            </span>
          )}
        </span>
        <span>{maxScore.toLocaleString()}</span>
      </div>
      <div className={styles.progressContainer}>
        <div
          className={`${styles.progressBar} ${getBarClass()} ${delta !== undefined ? styles.animating : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
