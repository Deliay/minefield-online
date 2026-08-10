import { useState } from 'react';
import { authApi, setToken } from '../services/api';
import type { User } from '../services/api';

interface LoginProps {
  onAuthed: (user: User) => void;
}

export function Login({ onAuthed }: LoginProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError(null);
    setPassword('');
    setConfirm('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register' && password !== confirm) {
      setError('两次输入的密码不一致');
      return;
    }

    setLoading(true);
    try {
      const result =
        mode === 'register'
          ? await authApi.register(username, password)
          : await authApi.login(username, password);
      setToken(result.token);
      onAuthed(result.user);
    } catch (err) {
      setError((err as Error).message || '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: 10,
    marginBottom: 12,
    borderRadius: 6,
    border: '1px solid #555',
    background: '#111',
    color: '#fff',
    boxSizing: 'border-box' as const,
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    border: 'none',
    background: '#2d7d46',
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    cursor: 'pointer',
  };

  return (
    <div
      style={{
        height: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff',
        fontFamily: 'monospace',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          width: 320,
          padding: 24,
          borderRadius: 10,
          background: '#1a1a1a',
          boxShadow: '0 0 20px rgba(0,0,0,0.8)',
        }}
      >
        <h2 style={{ textAlign: 'center', marginTop: 0 }}>
          {mode === 'register' ? '注册账号' : '登录'}
        </h2>

        <label htmlFor="login-username" style={{ display: 'block', marginBottom: 4 }}>用户名</label>
        <input
          id="login-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="3-20 位字母/数字/下划线"
          style={inputStyle}
          autoComplete="username"
        />

        <label htmlFor="login-password" style={{ display: 'block', marginBottom: 4 }}>密码</label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="至少 6 位"
          style={inputStyle}
          autoComplete="current-password"
        />

        {mode === 'register' && (
          <>
            <label htmlFor="login-confirm" style={{ display: 'block', marginBottom: 4 }}>确认密码</label>
            <input
              id="login-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="再次输入密码"
              style={inputStyle}
              autoComplete="new-password"
            />
          </>
        )}

        {error && (
          <div
            style={{
              color: '#ff6b6b',
              fontSize: 13,
              marginBottom: 12,
              padding: 8,
              background: 'rgba(255,0,0,0.1)',
              borderRadius: 6,
            }}
          >
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={buttonStyle}>
          {loading ? '处理中...' : mode === 'register' ? '注册并登录' : '登录'}
        </button>

        <div style={{ textAlign: 'center', marginTop: 14, fontSize: 13 }}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: '#4a9eff',
              cursor: 'pointer',
              fontSize: 13,
              padding: 0,
              marginLeft: 4,
            }}
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </div>
      </form>
    </div>
  );
}