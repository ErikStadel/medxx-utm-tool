import React, { useState } from 'react';

const Login = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-[var(--background-color)]">
      <div className="card p-8 w-full max-w-md shadow-xl border border-[var(--border-color)]">
        <h1 className="text-2xl mb-2 text-center font-bold">medxx-utm-tool</h1>
        <p className="text-center text-sm text-gray-400 mb-6">Bitte mit Benutzername und Passwort anmelden</p>
        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Benutzername</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="z.B. admin oder mitarbeiter"
              className="w-full p-2 border rounded-lg"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Passwort"
              className="w-full p-2 border rounded-lg"
            />
          </div>
        </div>
        {error && <p className="error-message mb-4 text-center text-red-500 text-sm">{error}</p>}
        <button onClick={handleLogin} className="primary w-full" disabled={isLoading}>
          {isLoading ? 'Anmelden...' : 'Anmelden'}
        </button>
      </div>
    </div>
  );
};

export default Login;
