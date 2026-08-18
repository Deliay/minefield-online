import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

  it('should render current player', () => {
    render(<LeaderboardPanel rankings={mockRankings} currentUsername="alice" />);
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('should render player score', () => {
    render(<LeaderboardPanel rankings={mockRankings} currentUsername="alice" />);
    expect(screen.getByText('42')).toBeDefined();
  });

  it('should collapse/expand panel when header is clicked', () => {
    render(<LeaderboardPanel rankings={mockRankings} currentUsername="alice" />);
    const header = screen.getByText('Leaderboard');
    fireEvent.click(header);
    
    const rankingsList = screen.getByText('Alice').closest('div');
    expect(rankingsList?.className).toContain('collapsed');
  });

  it('should expand panel after collapsing', () => {
    render(<LeaderboardPanel rankings={mockRankings} currentUsername="alice" />);
    const header = screen.getByText('Leaderboard');
    
    fireEvent.click(header);
    fireEvent.click(header);
    
    const rankingsList = screen.getByText('Alice').closest('div');
    expect(rankingsList?.className).not.toContain('collapsed');
  });

  it('should show empty state when no rankings', () => {
    render(<LeaderboardPanel rankings={[]} currentUsername="alice" />);
    expect(screen.getByText('No rankings yet')).toBeDefined();
  });
});
