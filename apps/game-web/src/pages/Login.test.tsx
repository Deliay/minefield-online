import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Login } from './Login';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setToken: vi.fn(),
}));

vi.mock('../services/api', () => ({
  ...mocks,
  authApi: {
    register: mocks.register,
    login: mocks.login,
    logout: mocks.logout,
  },
}));

const { register, login, setToken } = mocks;

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render login form by default', () => {
    render(<Login onAuthed={vi.fn()} />);
    expect(screen.getByRole('heading', { name: '登录' })).toBeDefined();
  });

  it('should show password-mismatch error on register', async () => {
    render(<Login onAuthed={vi.fn()} />);
    fireEvent.click(screen.getByText('去注册'));

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret1' } });
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'different' } });

    fireEvent.click(screen.getByText('注册并登录'));

    expect(await screen.findByText('两次输入的密码不一致')).toBeDefined();
    expect(register).not.toHaveBeenCalled();
  });

  it('should call register and store token on successful register', async () => {
    (register as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: 'tok',
      user: { username: 'alice', displayName: 'alice', score: 0 },
    });
    const onAuthed = vi.fn();
    render(<Login onAuthed={onAuthed} />);
    fireEvent.click(screen.getByText('去注册'));

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'secret1' } });
    fireEvent.change(screen.getByLabelText('确认密码'), { target: { value: 'secret1' } });

    fireEvent.click(screen.getByText('注册并登录'));
    await screen.findByText('注册并登录');

    expect(register).toHaveBeenCalledWith('alice', 'secret1');
    expect(setToken).toHaveBeenCalledWith('tok');
    expect(onAuthed).toHaveBeenCalled();
  });

  it('should call login on default mode and surface server error', async () => {
    const err = new Error('用户名或密码错误') as Error & { status?: number };
    err.status = 401;
    (login as ReturnType<typeof vi.fn>).mockRejectedValue(err);
    render(<Login onAuthed={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('用户名或密码错误')).toBeDefined();
    expect(login).toHaveBeenCalledWith('alice', 'wrong');
  });
});