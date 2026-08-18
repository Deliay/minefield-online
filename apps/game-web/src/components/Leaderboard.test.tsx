import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LeaderboardPanel } from './LeaderboardPanel';

const mockRankings = [
  { username: 'alice', displayName: 'Alice', score: 42, isCurrentPlayer: true },
  { username: 'bob', displayName: 'Bob', score: 10, isCurrentPlayer: false },
];

describe('LeaderboardPanel', () => {
  it('should render leaderboard title', () => {
    render(<LeaderboardPanel rankings={mockRankings} currentUsername="alice" />);
    expect(screen.getByText('Leaderboard')).toBeDefined();
  });

  it('should render displayName of other players', () => {
    render(<LeaderboardPanel rankings={mockRankings} currentUsername="alice" />);
    expect(screen.getByText('Bob')).toBeDefined();
  });

  it('should render player score', () => {
    render(<LeaderboardPanel rankings={mockRankings} currentUsername="alice" />);
    expect(screen.getByText('10 points')).toBeDefined();
  });
});