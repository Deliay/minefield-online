import { useEffect, useState } from 'react';
import { socketService, Ranking } from '../services/socket';

export function Leaderboard() {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [currentPlayerScore, setCurrentPlayerScore] = useState<number>(0);

  useEffect(() => {
    socketService.onLeaderboard((data) => {
      const sortedRankings = [...data.rankings].sort((a, b) => b.score - a.score);
      setRankings(sortedRankings);

      const currentPlayer = data.rankings.find((r) => r.isCurrentPlayer);
      if (currentPlayer) {
        setCurrentPlayerScore(currentPlayer.score);
      }
    });
  }, []);

  const currentSessionId = socketService.getSessionId();
  const displayRankings = rankings.filter((r) => !r.isCurrentPlayer);

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: 16,
        borderRadius: 8,
        minWidth: 200,
        maxHeight: 400,
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: 14,
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
              backgroundColor: ranking.isCurrentPlayer ? '#4a4' : 'transparent',
              borderRadius: 4,
            }}
          >
            <span style={{ color: '#888' }}>#{index + 1}</span>
            <span style={{ color: '#aaa' }}>{ranking.sessionId.slice(0, 6)}</span>
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
        <span style={{ color: '#4a4' }}>You:</span>
        <span style={{ fontSize: 18, fontWeight: 'bold', color: '#4a4' }}>
          {currentSessionId?.slice(0, 6)} - {currentPlayerScore}
        </span>
      </div>
    </div>
  );
}
