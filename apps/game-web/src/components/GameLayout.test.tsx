import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GameLayout } from './GameLayout';

describe('GameLayout', () => {
  it('should render children', () => {
    render(<GameLayout><div>Game Content</div></GameLayout>);
    expect(screen.getByText('Game Content')).toBeDefined();
  });

  it('should render sidebar when provided', () => {
    render(
      <GameLayout sidebar={<div>Sidebar Content</div>}>
        <div>Game Content</div>
      </GameLayout>
    );
    expect(screen.getByText('Sidebar Content')).toBeDefined();
  });

  it('should not render sidebar when not provided', () => {
    const { container } = render(<GameLayout><div>Game Content</div></GameLayout>);
    const sidebar = container.querySelector('[class*="sidebar"]');
    expect(sidebar).toBeNull();
  });

  it('should render background element', () => {
    const { container } = render(<GameLayout><div>Game Content</div></GameLayout>);
    const background = container.querySelector('[class*="background"]');
    expect(background).toBeDefined();
  });

  it('should render canvas container', () => {
    const { container } = render(<GameLayout><div>Game Content</div></GameLayout>);
    const canvasContainer = container.querySelector('[class*="canvasContainer"]');
    expect(canvasContainer).toBeDefined();
  });
});
