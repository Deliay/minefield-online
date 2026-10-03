import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NfModeToggle } from './NfModeToggle';

describe('NfModeToggle', () => {
  it('should render NF label', () => {
    render(<NfModeToggle nfMode={false} onToggle={() => {}} />);
    expect(screen.getByText('NF')).toBeDefined();
  });

  it('should be unchecked when nfMode is false', () => {
    render(<NfModeToggle nfMode={false} onToggle={() => {}} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
  });

  it('should be checked when nfMode is true', () => {
    render(<NfModeToggle nfMode={true} onToggle={() => {}} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });

  it('should call onToggle with true when checked', () => {
    const onToggle = vi.fn();
    render(<NfModeToggle nfMode={false} onToggle={onToggle} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it('should call onToggle with false when unchecked', () => {
    const onToggle = vi.fn();
    render(<NfModeToggle nfMode={true} onToggle={onToggle} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it('should be disabled when disabled prop is true', () => {
    render(<NfModeToggle nfMode={false} onToggle={() => {}} disabled={true} />);
    const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
  });

  it('should not call onToggle when disabled', () => {
    const onToggle = vi.fn();
    render(<NfModeToggle nfMode={false} onToggle={onToggle} disabled={true} />);
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    expect(onToggle).not.toHaveBeenCalled();
  });
});
