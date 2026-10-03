import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RankingCard } from './RankingCard';

const mockRanking = { username: 'alice', displayName: 'Alice', score: 100, isCurrentPlayer: false };

describe('RankingCard', () => {
  it('should render player name', () => {
    render(<RankingCard rank={1} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('should render score', () => {
    render(<RankingCard rank={1} ranking={{ ...mockRanking, score: 42 }} isCurrentPlayer={false} maxScore={100} />);
    const scores = screen.getAllByText('42');
    expect(scores.length).toBeGreaterThanOrEqual(1);
  });

  it('should render rank number', () => {
    render(<RankingCard rank={3} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    expect(screen.getByText('3')).toBeDefined();
  });

  it('should apply first place class for rank 1', () => {
    const { container } = render(<RankingCard rank={1} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    const rankEl = container.querySelector('[class*="rank"]');
    expect(rankEl?.className).toContain('first');
  });

  it('should apply currentPlayer class when isCurrentPlayer is true', () => {
    const { container } = render(<RankingCard rank={1} ranking={mockRanking} isCurrentPlayer={true} maxScore={100} />);
    const card = container.querySelector('[data-rank="1"]');
    expect(card?.className).toContain('currentPlayer');
  });

  it('should not apply currentPlayer class when isCurrentPlayer is false', () => {
    const { container } = render(<RankingCard rank={2} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    const card = container.querySelector('[data-rank="2"]');
    expect(card?.className).not.toContain('currentPlayer');
  });

  it('should show medal badge for top 3 ranks', () => {
    const { rerender } = render(<RankingCard rank={1} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    expect(screen.getByText('🥇')).toBeDefined();

    rerender(<RankingCard rank={2} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    expect(screen.getByText('🥈')).toBeDefined();

    rerender(<RankingCard rank={3} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    expect(screen.getByText('🥉')).toBeDefined();
  });

  it('should not show medal badge for rank 4+', () => {
    render(<RankingCard rank={4} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    expect(screen.queryByText('🥇')).toBeNull();
    expect(screen.queryByText('🥈')).toBeNull();
    expect(screen.queryByText('🥉')).toBeNull();
  });

  it('should apply second place class for rank 2', () => {
    const { container } = render(<RankingCard rank={2} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    const rankEl = container.querySelector('[class*="rank"]');
    expect(rankEl?.className).toContain('second');
  });

  it('should apply third place class for rank 3', () => {
    const { container } = render(<RankingCard rank={3} ranking={mockRanking} isCurrentPlayer={false} maxScore={100} />);
    const rankEl = container.querySelector('[class*="rank"]');
    expect(rankEl?.className).toContain('third');
  });

  it('should show NF badge when nfMode is true', () => {
    render(
      <RankingCard
        rank={1}
        ranking={{ ...mockRanking, nfMode: true, nfSettled: 5 }}
        isCurrentPlayer={false}
        maxScore={100}
      />
    );
    expect(screen.getByText('NF')).toBeDefined();
  });

  it('should not show NF badge when nfMode is false', () => {
    render(
      <RankingCard
        rank={1}
        ranking={{ ...mockRanking, nfMode: false, nfSettled: 0 }}
        isCurrentPlayer={false}
        maxScore={100}
      />
    );
    expect(screen.queryByText('NF')).toBeNull();
  });

  it('should not show NF badge when nfMode is undefined', () => {
    render(
      <RankingCard
        rank={1}
        ranking={{ ...mockRanking }}
        isCurrentPlayer={false}
        maxScore={100}
      />
    );
    expect(screen.queryByText('NF')).toBeNull();
  });
});
