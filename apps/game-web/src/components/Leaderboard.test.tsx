import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Leaderboard } from './Leaderboard';

vi.mock('../services/socket', async () => {
  const actual = await vi.importActual('../services/socket') as { socketService: object };
  return {
    ...actual,
    socketService: {
      ...(actual.socketService as object),
      getSessionId: vi.fn(() => 'test-session-123456'),
      onLeaderboard: vi.fn(),
    },
  };
});

describe('Leaderboard', () => {
  it('should render leaderboard title', () => {
    render(<Leaderboard />);
    expect(screen.getByText('Leaderboard')).toBeDefined();
  });
});
