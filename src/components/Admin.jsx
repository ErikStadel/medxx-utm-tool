import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Check, X } from 'lucide-react';
import LayoutHeader from './LayoutHeader';

const Admin = ({ user, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', role: 'standard', password: '' });
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users', {
        method: 'GET',
        credentials: 'include',
        headers: { 'x-admin-password': adminPassword },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Laden der Nutzer');
      }
      setUsers(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async () => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'GET',
        credentials: 'include',
        headers: { 'x-admin-password': adminPassword },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Ungültiges Admin-Passwort');
      }
      setIsAuthenticated(true);
      fetchUsers();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.role) {
      setError('Name und Rolle erforderlich');
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify(newUser),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Hinzufügen');
      }
      const data = await res.json();
      setUsers([...users, data]);
      setNewUser({ name: '', role: 'standard', password: '' });
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser.id || !editingUser.name || !editingUser.role) {
      setError('ID, Name und Rolle erforderlich');
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify(editingUser),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Aktualisieren');
      }
      const data = await res.json();
      setUsers(users.map(u => (u.id === data.id ? data : u)));
      setEditingUser(null);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (id) => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-password': adminPassword,
        },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }
      setUsers(users.filter(u => u.id !== id));
      setShowDeleteConfirm(null);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!isAuthenticated) handleAdminLogin();
      else if (editingUser) handleUpdateUser();
      else handleAddUser();
    } else if (e.key === 'Escape') {
      setEditingUser(null);
      setError('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[var(--background-color)]">
        <LayoutHeader title="Admin: Nutzerverwaltung" user={user} onLogout={onLogout} />
        <div className="flex items-center justify-center p-6 mt-12">
          <div className="card p-8 w-full max-w-md">
            <h2 className="text-xl mb-4 text-center">Admin-Berechtigung bestätigen</h2>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Admin-Passwort (ADMIN_PASSWORD)"
              className="mb-4 w-full p-2 border rounded-lg"
              autoFocus
            />
            {error && <p className="error-message mb-2 text-center">{error}</p>}
            <button onClick={handleAdminLogin} className="primary w-full" disabled={isLoading}>
              {isLoading ? 'Lädt...' : 'Bestätigen'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <LayoutHeader title="Admin: Nutzerverwaltung" user={user} onLogout={onLogout} />
      <div className="container content-container">
        <div className="card">
          <h2 className="text-xl mb-4">Neuen Nutzer hinzufügen</h2>
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value.toLowerCase() })}
                placeholder="Benutzername"
                className="w-full p-2 border rounded-lg"
                onKeyDown={handleKeyDown}
              />
              <input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Eigenes Passwort (optional)"
                className="w-full p-2 border rounded-lg"
                onKeyDown={handleKeyDown}
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="standard">Standard</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button onClick={handleAddUser} className="primary flex items-center gap-2" disabled={isLoading}>
              <Plus size={16} /> Hinzufügen
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>

          <h2 className="text-xl mb-4">Nutzerliste</h2>
          {isLoading ? (
            <p>Lädt...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse table-fixed min-w-full">
                <thead>
                  <tr className="bg-[var(--card-background)]">
                    <th className="border border-[var(--border-color)] p-2 text-left w-1/3">Name</th>
                    <th className="border border-[var(--border-color)] p-2 text-left w-1/3">Rolle</th>
                    <th className="border border-[var(--border-color)] p-2 text-center w-1/3">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, index) => (
                    <tr key={u.id} className={`border-t border-[var(--border-color)] ${index % 2 === 0 ? 'bg-[var(--section-background)]' : ''}`}>
                      <td className="p-2 break-words">
                        {editingUser?.id === u.id ? (
                          <input
                            type="text"
                            value={editingUser.name}
                            onChange={(e) =>
                              setEditingUser({ ...editingUser, name: e.target.value.toLowerCase() })
                            }
                            className="w-full p-1 border rounded-lg"
                            onKeyDown={handleKeyDown}
                          />
                        ) : (
                          u.name
                        )}
                      </td>
                      <td className="p-2 break-words">
                        {editingUser?.id === u.id ? (
                          <div className="flex gap-2">
                            <select
                              value={editingUser.role}
                              onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                              className="w-full p-1 border rounded-lg"
                            >
                              <option value="standard">Standard</option>
                              <option value="admin">Admin</option>
                            </select>
                            <input
                              type="password"
                              value={editingUser.password || ''}
                              onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                              placeholder="Neues PW (optional)"
                              className="w-full p-1 border rounded-lg"
                            />
                          </div>
                        ) : (
                          u.role
                        )}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-2 justify-center">
                          {editingUser?.id === u.id ? (
                            <>
                              <button onClick={handleUpdateUser} className="icon text-[var(--success-color)]" disabled={isLoading}>
                                <Check size={16} />
                              </button>
                              <button onClick={() => setEditingUser(null)} className="icon text-[var(--primary-color)]" disabled={isLoading}>
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingUser({ id: u.id, name: u.name, role: u.role, password: '' })}
                                className="icon text-[var(--primary-color)]"
                                disabled={isLoading}
                                title="Bearbeiten"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(u.id)}
                                className="danger icon"
                                disabled={isLoading}
                                title="Löschen"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg w-full max-w-md text-center">
                <h2 className="text-lg font-semibold mb-4">Nutzer löschen</h2>
                <p>Sind Sie sicher, dass Sie diesen Nutzer löschen möchten?</p>
                <div className="flex gap-2 justify-center mt-4">
                  <button onClick={() => handleDeleteUser(showDeleteConfirm)} className="danger px-4 py-2 rounded-lg" disabled={isLoading}>
                    {isLoading ? 'Wird gelöscht...' : 'Ja, löschen'}
                  </button>
                  <button onClick={() => setShowDeleteConfirm(null)} className="px-4 py-2 border rounded-lg" disabled={isLoading}>
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Admin;
