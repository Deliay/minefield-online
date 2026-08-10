import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Leaderboard } from './Leaderboard';

vi.mock('../services/socket', async () => {
  const actual = await vi.importActual('../services/socket');
  return {
    ...(actual as Record<string, unknown>),
    socketService: {
      getUser: vi.fn(() => ({ username: 'alice', displayName: 'Alice', score: 42 })),
      onLeaderboard: vi.fn((cb: (d: { rankings: Ranking[] }) => void) => {
        cb({
          rankings: [
            { username: 'alice', displayName: 'Alice', score: 42, isCurrentPlayer: true },
            { username: 'bob', displayName: 'Bob', score: 10, isCurrentPlayer: false },
          ],
        });
      }),
    },
  };
});

import type { Ranking } from '../services/socket';

describe('Leaderboard', () => {
  it('should render leaderboard title', () => {
    render(<Leaderboard />);
    expect(screen.getByText('Leaderboard')).toBeDefined();
  });

  it('should render displayName of other players', () => {
    render(<Leaderboard />);
    expect(screen.getByText('Bob')).toBeDefined();
  });

  it('should render current player displayName near the you-label', () => {
    render(<Leaderboard />);
    expect(screen.getByText('Alice - 42')).toBeDefined();
  });
});