import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserInfoCard } from './UserInfoCard';

const mockUser = {
  username: 'alice',
  displayName: 'Alice',
  score: 100,
};

describe('UserInfoCard', () => {
  it('should render username', () => {
    render(<UserInfoCard user={mockUser} onSetName={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('Alice')).toBeDefined();
  });

  it('should render avatar with first letter', () => {
    render(<UserInfoCard user={mockUser} onSetName={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('A')).toBeDefined();
  });

  it('should render score', () => {
    render(<UserInfoCard user={mockUser} onSetName={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('100')).toBeDefined();
  });

  it('should show change name form when Change Name is clicked', () => {
    render(<UserInfoCard user={mockUser} onSetName={vi.fn()} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText('Change Name'));
    expect(screen.getByPlaceholderText('Enter new name')).toBeDefined();
    expect(screen.getByText('Save')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  it('should call onSetName when form is submitted', () => {
    const onSetName = vi.fn();
    render(<UserInfoCard user={mockUser} onSetName={onSetName} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText('Change Name'));
    const input = screen.getByPlaceholderText('Enter new name');
    fireEvent.change(input, { target: { value: 'NewName' } });
    fireEvent.click(screen.getByText('Save'));
    expect(onSetName).toHaveBeenCalledWith('NewName');
  });

  it('should cancel editing when Cancel is clicked', () => {
    render(<UserInfoCard user={mockUser} onSetName={vi.fn()} onLogout={vi.fn()} />);
    fireEvent.click(screen.getByText('Change Name'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Enter new name')).toBeNull();
  });

  it('should call onLogout when Logout is clicked', () => {
    const onLogout = vi.fn();
    render(<UserInfoCard user={mockUser} onSetName={vi.fn()} onLogout={onLogout} />);
    fireEvent.click(screen.getByText('Logout'));
    expect(onLogout).toHaveBeenCalled();
  });

  it('should use username when displayName is empty string', () => {
    const userEmptyDisplayName = { ...mockUser, displayName: '' };
    render(<UserInfoCard user={userEmptyDisplayName} onSetName={vi.fn()} onLogout={vi.fn()} />);
    expect(screen.getByText('alice')).toBeDefined();
  });
});
