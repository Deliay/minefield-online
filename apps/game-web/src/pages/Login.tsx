import { useState } from 'react';
import { authApi, setToken } from '../services/api';
import type { User } from '../services/api';
import styles from './Login.module.css';

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

  return (
    <div className={styles.container}>
      <div className={styles.backgroundDecoration}>
        <div className={styles.decorationCircle} />
        <div className={styles.decorationCircle} />
        <div className={styles.decorationCircle} />
      </div>
      
      <div className={styles.formCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {mode === 'register' ? '注册账号' : '登录'}
          </h2>
          <p className={styles.subtitle}>
            {mode === 'register' ? '创建新账号开始游戏' : '欢迎回来，继续你的冒险'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="login-username" className={styles.label}>
              用户名
            </label>
            <input
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="3-20 位字母/数字/下划线"
              className={styles.input}
              autoComplete="username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="login-password" className={styles.label}>
              密码
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              className={styles.input}
              autoComplete="current-password"
            />
          </div>

          {mode === 'register' && (
            <div className={styles.inputGroup}>
              <label htmlFor="login-confirm" className={styles.label}>
                确认密码
              </label>
              <input
                id="login-confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="再次输入密码"
                className={styles.input}
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading} 
            className={styles.submitButton}
          >
            {loading ? '处理中...' : mode === 'register' ? '注册并登录' : '登录'}
          </button>
        </form>

        <div className={styles.switchMode}>
          {mode === 'login' ? '还没有账号？' : '已有账号？'}
          <button
            type="button"
            onClick={switchMode}
            className={styles.switchButton}
          >
            {mode === 'login' ? '去注册' : '去登录'}
          </button>
        </div>
      </div>
    </div>
  );
}