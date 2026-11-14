import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { applyTheme, getInitialTheme } from '../utils/theme';

const Login = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [theme, setTheme] = useState(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleLogin = async () => {
    if (!name.trim() || !password) {
      setError('Bitte Benutzername und Passwort eingeben');
      return;
    }
    try {
      setIsLoading(true);
      setError('');
      const res = await fetch('/api/users/validate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim().toLowerCase(), password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login fehlgeschlagen');
      }
      onLogin(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-color)] p-4 relative">
      <button
        type="button"
        onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        className="icon fixed top-4 right-4 flex items-center gap-1.5 text-xs px-3 py-1.5"
        title={theme === 'dark' ? 'Zum Bright Theme wechseln' : 'Zum Dark Theme wechseln'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        <span>{theme === 'dark' ? 'Bright' : 'Dark'}</span>
      </button>

      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl mb-2 text-center font-bold">medxx-utm-tool</h1>
        <p className="text-center text-sm text-[var(--text-muted)] mb-6">
          Bitte mit Benutzername und Passwort anmelden
        </p>
        <div className="space-y-4 mb-5">
          <div>
            <label>Benutzername</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="z. B. admin oder mitarbeiter"
              autoFocus
            />
          </div>
          <div>
            <label>Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Passwort"
            />
          </div>
        </div>
        {error && <div className="validation-message error-message mb-4">{error}</div>}
        <button type="button" onClick={handleLogin} className="primary w-full" disabled={isLoading}>
          {isLoading ? 'Anmelden...' : 'Anmelden'}
        </button>
      </div>
    </div>
  );
};

export default Login;
