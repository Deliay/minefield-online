import { useState, useEffect, useRef } from 'react';

interface NameModalProps {
  isOpen: boolean;
  onSubmit: (name: string) => void;
  initialName?: string;
}

export function NameModal({ isOpen, onSubmit, initialName = '' }: NameModalProps) {
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(isOpen);

  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      setName(initialName);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    prevOpenRef.current = isOpen;
  }, [isOpen, initialName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onSubmit(trimmed);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(30, 30, 40, 0.98)',
          color: 'white',
          padding: 24,
          borderRadius: 12,
          minWidth: 300,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          fontFamily: 'monospace',
        }}
      >
        <h2 style={{ margin: '0 0 16px 0', textAlign: 'center', color: '#4a4' }}>
          {initialName ? 'Edit Your Name' : 'Welcome!'}
        </h2>
        <p style={{ margin: '0 0 16px 0', color: '#aaa', textAlign: 'center', fontSize: 14 }}>
          {initialName ? 'Update your display name below' : 'Please enter your name to get started'}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 16,
              borderRadius: 6,
              border: '2px solid #444',
              backgroundColor: '#222',
              color: 'white',
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'monospace',
            }}
          />
          <button
            type="submit"
            disabled={!name.trim()}
            style={{
              width: '100%',
              marginTop: 16,
              padding: '12px 24px',
              fontSize: 16,
              fontWeight: 'bold',
              borderRadius: 6,
              border: 'none',
              backgroundColor: name.trim() ? '#4a4' : '#333',
              color: name.trim() ? 'white' : '#666',
              cursor: name.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'monospace',
              transition: 'background-color 0.2s',
            }}
          >
            {initialName ? 'Save' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
}