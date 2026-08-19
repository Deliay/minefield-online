import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScoreBar } from './ScoreBar';

describe('ScoreBar', () => {
  it('should render score value', () => {
    render(<ScoreBar score={42} maxScore={100} />);
    const values = screen.getAllByText('42');
    expect(values.length).toBeGreaterThanOrEqual(1);
  });

  it('should render max score', () => {
    render(<ScoreBar score={42} maxScore={100} />);
    const maxScores = screen.getAllByText('100');
    expect(maxScores.length).toBeGreaterThanOrEqual(1);
  });

  it('should render positive delta', () => {
    render(<ScoreBar score={42} maxScore={100} delta={10} />);
    expect(screen.getByText('+10')).toBeDefined();
  });

  it('should render negative delta', () => {
    render(<ScoreBar score={42} maxScore={100} delta={-5} />);
    expect(screen.getByText('-5')).toBeDefined();
  });

  it('should not render delta when not provided', () => {
    render(<ScoreBar score={42} maxScore={100} />);
    expect(screen.queryByText('+')).toBeNull();
  });

  it('should apply positive class for positive delta', () => {
    const { container } = render(<ScoreBar score={42} maxScore={100} delta={10} />);
    const delta = container.querySelector('[class*="delta"]');
    expect(delta?.className).toContain('positive');
  });

  it('should apply negative class for negative delta', () => {
    const { container } = render(<ScoreBar score={42} maxScore={100} delta={-5} />);
    const delta = container.querySelector('[class*="delta"]');
    expect(delta?.className).toContain('negative');
  });

  it('should calculate progress bar width correctly', () => {
    const { container } = render(<ScoreBar score={50} maxScore={200} />);
    const progressBar = container.querySelector('[class*="progressBar"]');
    expect(progressBar?.getAttribute('style')).toContain('width: 25%');
  });

  it('should cap progress at 100%', () => {
    const { container } = render(<ScoreBar score={200} maxScore={100} />);
    const progressBar = container.querySelector('[class*="progressBar"]');
    expect(progressBar?.getAttribute('style')).toContain('width: 100%');
  });

  it('should handle zero maxScore', () => {
    const { container } = render(<ScoreBar score={42} maxScore={0} />);
    const progressBar = container.querySelector('[class*="progressBar"]');
    expect(progressBar?.getAttribute('style')).toContain('width: 0%');
  });
});
