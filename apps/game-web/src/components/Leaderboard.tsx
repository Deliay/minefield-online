import { useEffect, useState } from 'react';
import type { Ranking } from '../services/socket';
import { socketService } from '../services/socket';

interface LeaderboardProps {
  onEditName?: () => void;
}

export function Leaderboard({ onEditName }: LeaderboardProps) {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [currentPlayerScore, setCurrentPlayerScore] = useState<number>(0);
  const [currentPlayerName, setCurrentPlayerName] = useState<string>('');
  const currentSessionId = socketService.getSessionId();

  useEffect(() => {
    socketService.onLeaderboard((data) => {
      const sortedRankings = [...data.rankings].sort((a, b) => b.score - a.score);
      setRankings(sortedRankings);

      const currentPlayer = data.rankings.find((r) => r.sessionId === currentSessionId?.slice(0, 6));
      if (currentPlayer) {
        setCurrentPlayerScore(currentPlayer.score);
        setCurrentPlayerName(currentPlayer.name);
      }
    });
  }, [currentSessionId]);

  const displayRankings = rankings;

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        zIndex: 1000,
        backgroundColor: 'rgba(30, 30, 40, 0.95)',
        color: 'white',
        padding: 16,
        borderRadius: 8,
        minWidth: 200,
        maxHeight: 400,
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: 14,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <h3 style={{ margin: '0 0 12px 0', textAlign: 'center' }}>Leaderboard</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {displayRankings.map((ranking, index) => (
          <div
            key={ranking.sessionId}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 8px',
              backgroundColor: ranking.sessionId === currentSessionId?.slice(0, 6) ? '#4a4' : 'transparent',
              borderRadius: 4,
            }}
          >
            <span style={{ color: '#888' }}>#{index + 1}</span>
            <span style={{ color: '#aaa' }}>{ranking.name}</span>
            <span style={{ fontWeight: 'bold' }}>{ranking.score}</span>
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px solid #444',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {onEditName && (
            <button
              type="button"
              onClick={onEditName}
              style={{
                padding: '2px 8px',
                fontSize: 12,
                borderRadius: 4,
                border: '1px solid #4a4',
                backgroundColor: 'transparent',
                color: '#4a4',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              Edit
            </button>
          )}
          <span style={{ fontSize: 16, fontWeight: 'bold', color: '#4a4' }}>
            {currentPlayerName} - {currentPlayerScore}
          </span>
        </div>
      </div>
    </div>
  );
}
