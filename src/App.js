import React, { useState, useEffect, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Copy, Search, Archive, Plus, Trash2, Edit3, Check, X, Menu, AlertTriangle, AlertCircle, CheckCircle, Info, LogOut } from 'lucide-react';
import './App.css';

const validateUtmCampaign = (value, isLibraryScreen = false) => {
  const errors = [];
  const warnings = [];

  if (!value || !value.trim()) {
    return {
      isValid: false,
      errors: ['Kampagnenname ist erforderlich'],
      warnings: []
    };
  }

  const trimmedValue = value.trim();

  // Grundlegende Zeichen-Validierung
  if (/\s/.test(trimmedValue)) {
    errors.push('Leerzeichen sind nicht erlaubt');
  }

  if (/[A-Z]/.test(trimmedValue)) {
    errors.push('Nur Kleinbuchstaben erlaubt');
  }

  // Erlaubte Zeichen: a-z, 0-9, _, {, }
  const invalidChars = trimmedValue.match(/[^a-z0-9_{}]/g);
  if (invalidChars) {
    const uniqueInvalidChars = [...new Set(invalidChars)];
    errors.push(`Ungültige Zeichen: ${uniqueInvalidChars.join(', ')} (nur a-z, 0-9, _, {} erlaubt)`);
  }

  // Spezielle Validierung für Library Screen (strengeres Format)
  if (isLibraryScreen) {
    return validateLibraryCampaign(trimmedValue, errors, warnings);
  }

  // UTM Builder Screen Validierung (flexibler)
  return validateBuilderCampaign(trimmedValue, errors, warnings);
};

const validateLibraryCampaign = (value, errors, warnings) => {
  // Format: YYYY_MM_aktion[_variante]
  const libraryPattern = /^20\d{2}_([0][1-9]|[1][0-2])_[a-z][a-z0-9_]*(_[a-z0-9][a-z0-9_]*)?$/;

  if (!libraryPattern.test(value)) {
    const parts = value.split('_');

    if (parts.length < 3) {
      errors.push('Format muss mindestens YYYY_MM_aktion enthalten');
    } else {
      // Jahr validieren
      const year = parts[0];
      if (!/^20\d{2}$/.test(year)) {
        if (!/^\d{4}$/.test(year)) {
          errors.push('Jahr muss 4-stellig sein (z.B. 2025)');
        } else if (!year.startsWith('20')) {
          errors.push('Jahr muss mit 20 beginnen (z.B. 2025)');
        }
      } else {
        const currentYear = new Date().getFullYear();
        const yearNum = parseInt(year);
        if (yearNum < currentYear - 1) {
          warnings.push(`Jahr ${year} liegt weit in der Vergangenheit`);
        } else if (yearNum > currentYear + 2) {
          warnings.push(`Jahr ${year} liegt weit in der Zukunft`);
        }
      }

      // Monat validieren
      const month = parts[1];
      if (!/^([0][1-9]|[1][0-2])$/.test(month)) {
        if (!/^\d{2}$/.test(month)) {
          errors.push('Monat muss 2-stellig sein (01-12)');
        } else if (month === '00') {
          errors.push('Monat 00 ist ungültig (verwende 01-12)');
        } else if (parseInt(month) > 12) {
          errors.push('Monat muss zwischen 01 und 12 liegen');
        } else if (!month.startsWith('0') && parseInt(month) < 10) {
          errors.push('Monat muss mit führender Null geschrieben werden (z.B. 08 statt 8)');
        }
      }

      // Aktion validieren
      const action = parts[2];
      if (!action) {
        errors.push('Aktion fehlt nach Jahr und Monat');
      } else if (!/^[a-z]/.test(action)) {
        errors.push('Aktion muss mit einem Kleinbuchstaben beginnen');
      } else if (!/^[a-z][a-z0-9_]*$/.test(action)) {
        errors.push('Aktion darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten');
      }

      // Variante validieren (falls vorhanden)
      if (parts.length > 3) {
        for (let i = 3; i < parts.length; i++) {
          const variant = parts[i];
          if (!variant) {
            errors.push(`Leere Variante an Position ${i + 1}`);
          } else if (!/^[a-z0-9][a-z0-9_]*$/.test(variant)) {
            errors.push(`Variante "${variant}" muss mit Buchstabe oder Zahl beginnen`);
          }
        }
      }
    }

    // Zusätzliche Validierungen
    if (value.includes('__')) {
      errors.push('Doppelte Unterstriche sind nicht erlaubt');
    }

    if (value.startsWith('_') || value.endsWith('_')) {
      errors.push('Kampagnenname darf nicht mit Unterstrich beginnen oder enden');
    }
  } else {
    const parts = value.split('_');
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();
    const campaignMonth = parseInt(parts[1]);
    const campaignYear = parseInt(parts[0]);

    if (campaignYear === currentYear && campaignMonth < currentMonth - 1) {
      warnings.push('Kampagne liegt mehrere Monate in der Vergangenheit');
    }

    if (parts[2].length < 3) {
      warnings.push('Aktionsname ist sehr kurz - erwäge einen beschreibenderen Namen');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

const validateBuilderCampaign = (value, errors, warnings) => {
  // Placeholder-Validierung
  const placeholderPattern = /\{[^}]*\}/g;
  const placeholders = value.match(placeholderPattern) || [];

  placeholders.forEach(placeholder => {
    if (placeholder === '{}') {
      errors.push('Leere Platzhalter {} sind nicht erlaubt');
    }
    const commonPlaceholders = ['{campaign}', '{keyword}', '{placement}', '{adgroup}', '{device}'];
    const placeholderName = placeholder.toLowerCase();
    if (!commonPlaceholders.includes(placeholderName) && !/\{[a-z_][a-z0-9_]*\}/.test(placeholderName)) {
      warnings.push(`Ungewöhnlicher Platzhalter: ${placeholder}`);
    }
  });

  // Struktur-Warnungen
  if (!value.includes('_') && !placeholders.length) {
    warnings.push('Kampagne sollte strukturiert sein (z.B. mit Unterstrichen)');
  }

  if (value.length < 3) {
    warnings.push('Sehr kurzer Kampagnenname');
  }

  if (value.length > 100) {
    errors.push('Kampagnenname ist zu lang (max. 100 Zeichen)');
  }

  if (value.includes('__')) {
    errors.push('Doppelte Unterstriche sind nicht erlaubt');
  }

  if (value.startsWith('_') || value.endsWith('_')) {
    errors.push('Kampagnenname darf nicht mit Unterstrich beginnen oder enden');
  }

  if (/\d{3,}$/.test(value)) {
    warnings.push('Lange Zahlensequenz am Ende - ist das beabsichtigt?');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Erweiterte validateNomenclature Funktion
const validateNomenclature = (value, field, isLibraryScreen = false, selectedChannel = '') => {
  const validationResult = { [field]: null };

  if (!value && field !== 'customParams') return validationResult;

  if (field === 'campaign') {
    const result = validateUtmCampaign(value, isLibraryScreen);
    if (!result.isValid) {
      validationResult[field] = result.errors.join('; ');
    } else if (result.warnings.length > 0) {
      validationResult[field + '_warning'] = result.warnings.join('; ');
    }
    return validationResult;
  }

  if (field === 'customParams' && value) {
    const paramPairs = value.split('&').map(pair => pair.trim());
    for (const pair of paramPairs) {
      if (!pair) {
        validationResult[field] = 'Leere Parameter sind nicht erlaubt';
        return validationResult;
      }
      if (!/^[a-zA-Z0-9_]+=[a-zA-Z0-9_]+$/.test(pair)) {
        validationResult[field] = 'Format muss [Parameter]=[Value] sein, z.B. param1=value1';
        return validationResult;
      }
    }
    return validationResult;
  }

  if (field === 'content' || field === 'term') {
    if (field === 'content' && (selectedChannel === 'Facebook Ads' || selectedChannel === 'Tiktok Ads')) {
      const allowedDatalistValues = ['{{placement}}', '__PLACEMENT__'];
      if (allowedDatalistValues.includes(value)) {
        return validationResult;
      }
    }

    if (/[^a-z0-9_{}]/.test(value)) {
      if (/[A-Z]/.test(value)) {
        validationResult[field] = 'Nur Kleinbuchstaben erlaubt';
      } else if (/\s/.test(value)) {
        validationResult[field] = 'Keine Leerzeichen erlaubt';
      } else {
        const invalidChars = value.match(/[^a-z0-9_{}]/g);
        if (invalidChars) {
          const uniqueInvalidChars = [...new Set(invalidChars)];
          validationResult[field] = `Ungültige Zeichen: ${uniqueInvalidChars.join(', ')}`;
        }
      }
    }
  }

  return validationResult;
};

// Validierungsnachrichten-Komponente
const ValidationMessage = ({ field, errors, className = '' }) => {
  const errorMessage = errors[field];
  const warningMessage = errors[field + '_warning'];

  if (!errorMessage && !warningMessage) return null;

  if (errorMessage) {
    return (
      <div className={`validation-message error-message ${className}`}>
        <AlertCircle size={16} className="inline mr-2" />
        {errorMessage}
      </div>
    );
  }

  if (warningMessage) {
    return (
      <div className={`validation-message warning-message ${className}`}>
        <AlertTriangle size={16} className="inline mr-2" />
        {warningMessage}
      </div>
    );
  }

  return null;
};

// Kampagnen-Input Komponente
const CampaignInput = ({
  value,
  onChange,
  onFocus,
  validationErrors,
  isLibraryScreen = false,
  showPreview = false,
  campaignDropdownRef,
  showCampaignDropdown,
  campaignSearchTerm,
  filteredCampaigns,
  handleCampaignSelect,
  handleCampaignSearchChange,
  sortedCampaigns,
  setFilteredCampaigns,
  setShowCampaignDropdown
}) => {
  const getFormatExample = () => {
    if (isLibraryScreen) {
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      return `${currentYear}_${currentMonth}_urlaubsrabatt_01`;
    }
    return "z.B. 2025_08_urlaubsrabatt_01";
  };

  const getFormatHelp = () => {
    if (isLibraryScreen) {
      return "Format: YYYY_MM_aktion[_variante]";
    }
    return "Kleinbuchstaben, Zahlen, Unterstriche und {} (z.B. de_dd_black_week)";
  };

  const analyzeFormat = () => {
    if (!value || isLibraryScreen) return null;
    const parts = value.split('_');
    const analysis = [];
    if (parts.length >= 1) {
      analysis.push(`Segment${parts.length > 1 ? 'e' : ''}: ${parts.join(', ')}`);
    }
    return analysis.length > 0 ? analysis.join(' • ') : null;
  };

  const hasError = validationErrors.campaign;
  const hasWarning = validationErrors.campaign_warning;
  const getInputClassName = () => {
    if (hasError) return 'w-full error border-red-500 focus:border-red-500 pr-10';
    if (hasWarning) return 'w-full warning border-yellow-500 focus:border-yellow-500 pr-10';
    if (value) return 'w-full valid border-green-500 focus:border-green-500 pr-10';
    return 'w-full pr-10';
  };

  const getValidationIcon = () => {
    if (hasError) return <AlertCircle size={20} className="text-red-500" />;
    if (hasWarning) return <AlertTriangle size={20} className="text-yellow-500" />;
    if (value) return <CheckCircle size={20} className="text-green-500" />;
    return null;
  };

  return (
    <div className="campaign-input-container">
      <label className="block text-sm font-medium mb-1">
        UTM Campaign *
        <span className="text-xs text-gray-500 ml-2">{getFormatHelp()}</span>
      </label>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange('campaign', e.target.value)}
            onFocus={onFocus}
            placeholder={getFormatExample()}
            className={getInputClassName()}
          />
          {getValidationIcon() && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              {getValidationIcon()}
            </div>
          )}
        </div>

        <div className="relative flex-1" ref={campaignDropdownRef}>
          <input
            type="text"
            value={campaignSearchTerm}
            onChange={handleCampaignSearchChange}
            onFocus={() => {
              setShowCampaignDropdown(true);
              const campaigns = Array.isArray(sortedCampaigns) ? sortedCampaigns : [];
              setFilteredCampaigns(campaigns);
            }}
            className="w-full"
            placeholder="Aus Bibliothek wählen"
          />
          {showCampaignDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-[var(--card-background)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {Array.isArray(filteredCampaigns) && filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="px-4 py-2 hover:bg-[var(--hover-background)] cursor-pointer text-sm"
                    onClick={() => handleCampaignSelect(campaign.name)}
                  >
                    <span className="font-medium">{campaign.name}</span>
                    <span className="text-xs text-gray-400 ml-2">({campaign.category})</span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  {Array.isArray(sortedCampaigns) && sortedCampaigns.length === 0
                    ? 'Noch keine Kampagnen in der Bibliothek'
                    : 'Keine passenden Kampagnen gefunden'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ValidationMessage field="campaign" errors={validationErrors} className="mt-1" />

      {showPreview && analyzeFormat() && (
        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm">
          <Info size={16} className="inline mr-2 text-blue-600" />
          <span className="text-blue-800">{analyzeFormat()}</span>
        </div>
      )}
    </div>
  );
};

// Login Komponente mit Benutzername & Passwort
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

// Admin Komponente
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
      const data = await res.json();
      setUsers(data);
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
      if (!isAuthenticated) {
        handleAdminLogin();
      } else if (editingUser) {
        handleUpdateUser();
      } else {
        handleAddUser();
      }
    } else if (e.key === 'Escape') {
      setEditingUser(null);
      setError('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background-color)]">
        <div className="card p-8 w-full max-w-md">
          <h1 className="text-2xl mb-4 text-center">Admin-Berechtigung bestätigen</h1>
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
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <header className="bg-[var(--card-background)] border-b border-[var(--border-color)] p-4">
        <div className="container flex justify-between items-center">
          <h1>Admin: Nutzerverwaltung</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Eingeloggt als: {user.name}</span>
            <button onClick={onLogout} className="icon text-red-400 hover:text-red-300" title="Abmelden">
              <LogOut size={20} />
            </button>
            <Link to="/" className="icon">
              <X size={24} />
            </Link>
          </div>
        </div>
      </header>
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
            <button onClick={handleAddUser} className="primary" disabled={isLoading}>
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
                    <th className="border p-2 text-left w-1/3">Name</th>
                    <th className="border p-2 text-left w-1/3">Rolle</th>
                    <th className="border p-2 text-center w-1/3">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, index) => (
                    <tr key={u.id} className={`border-t ${index % 2 === 0 ? 'bg-gray-800' : ''}`}>
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
                              <button
                                onClick={handleUpdateUser}
                                className="icon text-[var(--success-color)]"
                                disabled={isLoading}
                              >
                                <Check size={16} />
                              </button>
                              <button
                                onClick={() => setEditingUser(null)}
                                className="icon text-blue-300"
                                disabled={isLoading}
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => setEditingUser({ id: u.id, name: u.name, role: u.role, password: '' })}
                                className="icon text-blue-300"
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
                  <button
                    onClick={() => handleDeleteUser(showDeleteConfirm)}
                    className="danger px-4 py-2 rounded-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Wird gelöscht...' : 'Ja, löschen'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="px-4 py-2 border rounded-lg"
                    disabled={isLoading}
                  >
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

// UTM Builder Komponente
const UTMBuilder = ({ campaigns, setCampaigns, user, onLogout }) => {
  const [selectedChannel, setSelectedChannel] = useState('');
  const [utmParams, setUtmParams] = useState({
    source: '',
    medium: '',
    campaign: '',
    content: '',
    term: '',
    customParams: ''
  });
  const [baseUrl, setBaseUrl] = useState('https://example.com');
  const [copySuccess, setCopySuccess] = useState(false);
  const [copyTemplateSuccess, setCopyTemplateSuccess] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);

  const campaignDropdownRef = useRef(null);

  const channels = {
    'Google Ads': { source: 'google', medium: 'cpc', showTerm: true },
    'Bing Ads': { source: 'bing', medium: 'cpc', showTerm: true },
    'Facebook Ads': { source: '{{site_source_name}}', medium: 'cpc', showTerm: false },
    'Tiktok Ads': { source: 'tiktok', medium: 'cpc', showTerm: false },
    'Email': { source: 'newsletter', medium: 'email', showTerm: false },
    'Social Organic': { source: '', medium: 'organic', showTerm: false, sourceDropdown: true },
    'SEO': { source: 'google', medium: 'organic', showTerm: false },
    'Affiliate': { source: '', medium: 'aff', showTerm: false, sourceEditable: true },
    'Koop': { source: '', medium: 'koop', showTerm: false, sourceEditable: true },
    'Push': { source: 'website', medium: 'push', showTerm: false }
  };

  const sortedCampaigns = useMemo(() => {
    if (!Array.isArray(campaigns)) return [];
    return [...campaigns].sort((a, b) => a.name.localeCompare(b.name));
  }, [campaigns]);

  useEffect(() => {
    setFilteredCampaigns(sortedCampaigns);
  }, [sortedCampaigns]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target)) {
        setShowCampaignDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChannelChange = (channel) => {
    setSelectedChannel(channel);
    if (!channel) {
      setUtmParams(prev => ({ ...prev, source: '', medium: '', customParams: '' }));
      return;
    }
    const config = channels[channel];
    let customParams = '';
    if (channel === 'Facebook Ads') {
      customParams = 'fbclid={{fbclid}}';
    } else if (channel === 'Tiktok Ads') {
      customParams = 'ttclid={{ttclid}}';
    }
    setUtmParams(prev => ({
      ...prev,
      source: config.source,
      medium: config.medium,
      customParams
    }));
  };

  const handleParamChange = (field, value) => {
    setUtmParams(prev => ({ ...prev, [field]: value }));
    const errors = validateNomenclature(value, field, false, selectedChannel);
    setValidationErrors(prev => ({ ...prev, ...errors, [field]: errors[field] || null }));
  };

  const handleCampaignSearchChange = (e) => {
    const value = e.target.value;
    setCampaignSearchTerm(value);
    const list = Array.isArray(sortedCampaigns) ? sortedCampaigns : [];
    if (value.length >= 2) {
      setFilteredCampaigns(list.filter(c => c.name.toLowerCase().includes(value.toLowerCase())));
    } else {
      setFilteredCampaigns(list);
    }
  };

  const handleCampaignSelect = (name) => {
    handleParamChange('campaign', name);
    setShowCampaignDropdown(false);
    setCampaignSearchTerm('');
  };

  const generateTrackingTemplate = () => {
    if (!utmParams.source || !utmParams.medium || !utmParams.campaign) return '';
    const parts = [];
    parts.push(`utm_source=${utmParams.source}`);
    parts.push(`utm_medium=${utmParams.medium}`);
    parts.push(`utm_campaign=${utmParams.campaign}`);
    if (utmParams.content) parts.push(`utm_content=${utmParams.content}`);
    if (utmParams.term && channels[selectedChannel]?.showTerm) parts.push(`utm_term=${utmParams.term}`);
    if (utmParams.customParams) {
      const customPairs = utmParams.customParams.split('&').map(pair => pair.trim());
      for (const pair of customPairs) {
        if (pair) parts.push(pair);
      }
    }
    return parts.join('&');
  };

  const generateUrl = () => {
    if (!baseUrl || !utmParams.source || !utmParams.medium || !utmParams.campaign) return '';
    let url = baseUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    const separator = url.includes('?') ? '&' : '?';
    const query = generateTrackingTemplate();
    return query ? `${url}${separator}${query}` : url;
  };

  const copyToClipboard = async () => {
    const url = generateUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const copyTrackingTemplateToClipboard = async () => {
    const template = generateTrackingTemplate();
    if (template) {
      await navigator.clipboard.writeText(template);
      setCopyTemplateSuccess(true);
      setTimeout(() => setCopyTemplateSuccess(false), 2000);
    }
  };

  const hasValidationErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined && !error.endsWith('_warning'));
  const canGenerateUrl = selectedChannel && utmParams.source && utmParams.medium && utmParams.campaign && !hasValidationErrors;

  return (
    <div className="min-h-screen bg-[var(--background-color)] relative">
      <header className="bg-[var(--card-background)] border-b border-[var(--border-color)] p-4">
        <div className="container flex justify-between items-center">
          <h1>medxx UTM Parameter Builder</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Eingeloggt als: {user.name}</span>
            <button onClick={onLogout} className="icon text-red-400 hover:text-red-300" title="Abmelden">
              <LogOut size={20} />
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="icon">
              <Menu size={24} />
            </button>
          </div>
        </div>
      </header>

      <div className={`menu ${menuOpen ? 'menu-open' : ''}`}>
        <button onClick={() => setMenuOpen(false)} className="icon absolute top-4 right-4">
          <X size={24} />
        </button>
        <Link to="/library" onClick={() => setMenuOpen(false)} className="menu-item">Kampagnen</Link>
        {user.role === 'admin' && (
          <Link to="/admin" onClick={() => setMenuOpen(false)} className="menu-item">Admin</Link>
        )}
        <button onClick={() => { setMenuOpen(false); onLogout(); }} className="menu-item text-left text-red-400 w-full mt-4 flex items-center gap-2">
          <LogOut size={18} /> Abmelden
        </button>
      </div>

      <div className="container content-container relative z-10">
        <div className="card">
          <p className="mb-4 text-gray-300">Erstelle konsistente UTM-Parameter für alle Marketing-Channels</p>
          <div>
            <h2>UTM Parameter Generator</h2>
            <div className="space-y-6">
              <div>
                <label>Base URL</label>
                <input
                  type="url"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  className="w-full"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label>Channel auswählen</label>
                <select
                  value={selectedChannel}
                  onChange={(e) => handleChannelChange(e.target.value)}
                  className="w-full"
                >
                  <option value="">-- Channel wählen --</option>
                  {Object.keys(channels).map(channel => (
                    <option key={channel} value={channel}>{channel}</option>
                  ))}
                </select>
              </div>

              {selectedChannel && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label>UTM Source</label>
                      {channels[selectedChannel]?.sourceEditable ? (
                        <input
                          type="text"
                          value={utmParams.source}
                          onChange={(e) => setUtmParams(prev => ({ ...prev, source: e.target.value }))}
                          className="w-full"
                          placeholder="z.B. partnerName"
                        />
                      ) : channels[selectedChannel]?.sourceDropdown ? (
                        <select
                          value={utmParams.source}
                          onChange={(e) => setUtmParams(prev => ({ ...prev, source: e.target.value }))}
                          className="w-full"
                        >
                          <option value="">-- Wählen --</option>
                          <option value="facebook">facebook</option>
                          <option value="instagram">instagram</option>
                          <option value="linkedin">linkedin</option>
                          <option value="youtube">youtube</option>
                          <option value="pinterest">pinterest</option>
                          <option value="twitter">twitter</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={utmParams.source}
                          readOnly
                          className="w-full bg-gray-800"
                        />
                      )}
                    </div>

                    <div>
                      <label>UTM Medium</label>
                      <input
                        type="text"
                        value={utmParams.medium}
                        readOnly
                        className="w-full bg-gray-800"
                      />
                    </div>
                  </div>

                  <CampaignInput
                    value={utmParams.campaign}
                    onChange={handleParamChange}
                    onFocus={() => setShowCampaignDropdown(false)}
                    validationErrors={validationErrors}
                    isLibraryScreen={false}
                    showPreview={true}
                    campaignDropdownRef={campaignDropdownRef}
                    showCampaignDropdown={showCampaignDropdown}
                    campaignSearchTerm={campaignSearchTerm}
                    filteredCampaigns={filteredCampaigns}
                    handleCampaignSelect={handleCampaignSelect}
                    handleCampaignSearchChange={handleCampaignSearchChange}
                    sortedCampaigns={sortedCampaigns}
                    setFilteredCampaigns={setFilteredCampaigns}
                    setShowCampaignDropdown={setShowCampaignDropdown}
                  />

                  <div>
                    <label>UTM Content (optional)</label>
                    <div className="relative">
                      {selectedChannel === 'Facebook Ads' || selectedChannel === 'Tiktok Ads' ? (
                        <>
                          <input
                            type="text"
                            list="content-suggestions"
                            value={utmParams.content}
                            onChange={(e) => handleParamChange('content', e.target.value)}
                            onFocus={() => setShowCampaignDropdown(false)}
                            className={`w-full ${validationErrors.content ? 'error border-red-500' : ''}`}
                            placeholder="z.B. banner_top oder {{placement}}"
                          />
                          <datalist id="content-suggestions">
                            <option value="{{placement}}" />
                            <option value="__PLACEMENT__" />
                          </datalist>
                        </>
                      ) : (
                        <input
                          type="text"
                          value={utmParams.content}
                          onChange={(e) => handleParamChange('content', e.target.value)}
                          onFocus={() => setShowCampaignDropdown(false)}
                          className={`w-full ${validationErrors.content ? 'error border-red-500' : ''}`}
                          placeholder="z.B. banner_top"
                        />
                      )}
                      {validationErrors.content && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <AlertCircle size={20} className="text-red-500" />
                        </div>
                      )}
                    </div>
                    <ValidationMessage field="content" errors={validationErrors} className="mt-1" />
                  </div>

                  {channels[selectedChannel]?.showTerm && (
                    <div>
                      <label>UTM Term (optional)</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={utmParams.term}
                          onChange={(e) => handleParamChange('term', e.target.value)}
                          onFocus={() => setShowCampaignDropdown(false)}
                          className={`w-full ${validationErrors.term ? 'error border-red-500' : ''}`}
                          placeholder="keyword"
                        />
                        {validationErrors.term && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <AlertCircle size={20} className="text-red-500" />
                          </div>
                        )}
                      </div>
                      <ValidationMessage field="term" errors={validationErrors} className="mt-1" />
                    </div>
                  )}

                  <div>
                    <label>Benutzerdefinierte Parameter (optional)</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={utmParams.customParams}
                        onChange={(e) => handleParamChange('customParams', e.target.value)}
                        onFocus={() => setShowCampaignDropdown(false)}
                        className={`w-full ${validationErrors.customParams ? 'error border-red-500' : ''}`}
                        placeholder="param1=value1&param2=value2"
                      />
                      {validationErrors.customParams && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <AlertCircle size={20} className="text-red-500" />
                        </div>
                      )}
                    </div>
                    <ValidationMessage field="customParams" errors={validationErrors} className="mt-1" />
                  </div>
                </>
              )}

              {canGenerateUrl && (
                <>
                  <div className="generated-url-container">
                    <h3>Generierte URL:</h3>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={generateUrl()}
                        readOnly
                        className="flex-1 px-4 py-3 text-sm bg-gray-800 border border-[var(--border-color)] rounded-lg"
                      />
                      <button onClick={copyToClipboard} className={copySuccess ? 'success' : 'primary'}>
                        {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    {copySuccess && <p className="text-[var(--success-color)] text-sm mt-2">✓ URL in Zwischenablage kopiert!</p>}
                  </div>

                  <div className="generated-url-container">
                    <h3>Tracking-Vorlage (nur Parameter):</h3>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={generateTrackingTemplate()}
                        readOnly
                        className="flex-1 px-4 py-3 text-sm bg-gray-800 border border-[var(--border-color)] rounded-lg"
                      />
                      <button onClick={copyTrackingTemplateToClipboard} className={copyTemplateSuccess ? 'success' : 'primary'}>
                        {copyTemplateSuccess ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                    {copyTemplateSuccess && <p className="text-[var(--success-color)] text-sm mt-2">✓ Tracking-Vorlage in Zwischenablage kopiert!</p>}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Kampagnen-Bibliothek
const CampaignLibrary = ({ campaigns, setCampaigns, user, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', category: '', archived: false, inhaber: user.name });
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [copySuccess, setCopySuccess] = useState({});

  const categories = ['Saisonale Aktionen', 'Produktlaunches', 'Gewinnspiele', 'Rabattaktionen', 'Brand Awareness', 'Sonstiges'];

  const addCampaign = async () => {
    if (newCampaign.name && newCampaign.category) {
      const errors = validateNomenclature(newCampaign.name, 'campaign', true);
      if (errors.campaign) {
        setValidationErrors(errors);
        return;
      }
      try {
        const res = await fetch('/api/campaigns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(newCampaign),
        });
        if (!res.ok) throw new Error('Fehler beim Speichern');
        const savedCampaign = await res.json();
        setCampaigns(prev => [...prev, savedCampaign]);
        setNewCampaign({ name: '', category: '', archived: false, inhaber: user.name });
        setValidationErrors({});
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const updateCampaign = async (id, updatedFields) => {
    try {
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, ...updatedFields }),
      });
      if (!res.ok) throw new Error('Fehler beim Aktualisieren');
      const updated = await res.json();
      setCampaigns(prev => prev.map(c => c.id === id ? updated : c));
      setEditingCampaign(null);
    } catch (err) {
      alert(err.message);
    }
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Kampagne wirklich löschen?')) return;
    try {
      const res = await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Fehler beim Löschen');
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  };

  const toggleArchive = async (id) => {
    const campaign = campaigns.find(c => c.id === id);
    if (!campaign) return;
    await updateCampaign(id, { ...campaign, archived: !campaign.archived });
  };

  const copyCampaignName = async (id, name) => {
    await navigator.clipboard.writeText(name);
    setCopySuccess(prev => ({ ...prev, [id]: true }));
    setTimeout(() => {
      setCopySuccess(prev => ({ ...prev, [id]: false }));
    }, 2000);
  };

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          campaign.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArchived = showArchived ? campaign.archived : !campaign.archived;
    return matchesSearch && matchesArchived;
  });

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <header className="bg-[var(--card-background)] border-b border-[var(--border-color)] p-4">
        <div className="container flex justify-between items-center">
          <h1>Kampagnen-Bibliothek</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Eingeloggt als: {user.name}</span>
            <button onClick={onLogout} className="icon text-red-400 hover:text-red-300" title="Abmelden">
              <LogOut size={20} />
            </button>
            <Link to="/" className="icon"><X size={24} /></Link>
          </div>
        </div>
      </header>

      <div className="container content-container">
        <div className="card">
          <div>
            <h2>Kampagnen-Bibliothek</h2>
            <div className="mb-6 p-6 bg-[var(--card-background)] rounded-lg border border-custom shadow-lg">
              <h3>
                Neue Kampagne hinzufügen
                <span className="text-xs text-gray-500 ml-2">Format: YYYY_MM_aktion[_variante]</span>
              </h3>
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Kampagnenname (z.B. 2025_08_urlaubsrabatt_01)"
                    value={newCampaign.name}
                    onChange={(e) => {
                      const newValue = e.target.value;
                      setNewCampaign(prev => ({ ...prev, name: newValue }));
                      const errors = validateNomenclature(newValue, 'campaign', true);
                      setValidationErrors(errors);
                    }}
                    className={`w-full ${validationErrors.campaign ? 'error border-red-500' : ''} pr-10`}
                  />
                  {validationErrors.campaign && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <AlertCircle size={20} className="text-red-500" />
                    </div>
                  )}
                </div>
                <ValidationMessage field="campaign" errors={validationErrors} />

                <div className="flex gap-3">
                  <select
                    value={newCampaign.category}
                    onChange={(e) => setNewCampaign(prev => ({ ...prev, category: e.target.value }))}
                    className="flex-1"
                  >
                    <option value="">-- Kategorie wählen --</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>

                  {user.role === 'admin' && (
                    <select
                      value={newCampaign.inhaber}
                      onChange={(e) => setNewCampaign(prev => ({ ...prev, inhaber: e.target.value }))}
                      className="flex-1"
                    >
                      <option value={user.name}>{user.name} (eigene)</option>
                      <option value="alle">Alle</option>
                    </select>
                  )}

                  <button
                    onClick={addCampaign}
                    className="primary"
                    disabled={!newCampaign.name || !newCampaign.category || validationErrors.campaign}
                  >
                    <Plus size={16} /> Hinzufügen
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Kampagnen durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10"
                />
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />
                Archivierte anzeigen
              </label>
            </div>

            <div className="space-y-2">
              {filteredCampaigns.map(campaign => (
                <div
                  key={campaign.id}
                  className={`flex items-center justify-between p-3 rounded-lg border border-[var(--border-color)] ${
                    campaign.archived ? 'opacity-60 bg-gray-800' : 'bg-[var(--card-background)]'
                  }`}
                >
                  <div className="flex-1">
                    {editingCampaign === campaign.id ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <input
                            type="text"
                            value={campaign.name}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setCampaigns(prev => prev.map(c =>
                                c.id === campaign.id ? { ...c, name: newValue } : c
                              ));
                              const errors = validateNomenclature(newValue, 'campaign', true);
                              setValidationErrors(errors);
                            }}
                            className={`w-full px-2 py-1 text-sm ${validationErrors.campaign ? 'error border-red-500' : ''} pr-8`}
                          />
                          {validationErrors.campaign && (
                            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                              <AlertCircle size={16} className="text-red-500" />
                            </div>
                          )}
                        </div>
                        <ValidationMessage field="campaign" errors={validationErrors} />
                        <select
                          value={campaign.category}
                          onChange={(e) => setCampaigns(prev => prev.map(c =>
                            c.id === campaign.id ? { ...c, category: e.target.value } : c
                          ))}
                          className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded-lg"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        {user.role === 'admin' && (
                          <select
                            value={campaign.inhaber || user.name}
                            onChange={(e) => setCampaigns(prev => prev.map(c =>
                              c.id === campaign.id ? { ...c, inhaber: e.target.value } : c
                            ))}
                            className="w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded-lg"
                          >
                            <option value={user.name}>{user.name} (eigene)</option>
                            <option value="alle">Alle</option>
                          </select>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-sm">{campaign.name}</div>
                        <div className="text-xs text-gray-500">{campaign.category} | Inhaber: {campaign.inhaber || user.name}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {editingCampaign === campaign.id ? (
                      <>
                        <button
                          onClick={() => updateCampaign(campaign.id, campaign)}
                          className="icon text-[var(--success-color)]"
                          disabled={Boolean(validationErrors.campaign)}
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setEditingCampaign(null)}
                          className="icon text-blue-300"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="relative flex items-center">
                          <button
                            onClick={() => copyCampaignName(campaign.id, campaign.name)}
                            className={`icon ${copySuccess[campaign.id] ? 'text-[var(--success-color)]' : 'text-blue-300'}`}
                            title="Kopieren"
                          >
                            <Copy size={14} />
                          </button>
                          {copySuccess[campaign.id] && (
                            <span className="ml-2 text-[var(--success-color)] text-xs">
                              ✓ Kopiert!
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingCampaign(campaign.id)}
                          className="icon text-blue-300"
                          title="Bearbeiten"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => toggleArchive(campaign.id)}
                          className={`icon ${campaign.archived ? 'text-blue-600' : 'text-orange-600'}`}
                          title={campaign.archived ? 'Dearchivieren' : 'Archivieren'}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="danger icon"
                          title="Löschen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {filteredCampaigns.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  {showArchived ? 'Keine archivierten Kampagnen gefunden' : 'Keine aktiven Kampagnen gefunden'}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await fetch('/api/users/validate-token', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setUser({ name: data.name, role: data.role });
        } else {
          setUser(null);
        }
      } catch (err) {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    validateToken();
  }, []);

  useEffect(() => {
    if (!user) return;
    const loadCampaigns = async () => {
      try {
        const res = await fetch('/api/campaigns', { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rows = Array.isArray(data) ? data : data?.rows || [];
        setCampaigns(rows);
      } catch (e) {
        console.error('Kampagnen laden fehlgeschlagen:', e.message);
      }
    };
    loadCampaigns();
  }, [user]);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = async () => {
    try {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout-Fehler:', e);
    }
    setUser(null);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Lädt...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={<UTMBuilder campaigns={campaigns} setCampaigns={setCampaigns} user={user} onLogout={handleLogout} />}
        />
        <Route
          path="/library"
          element={<CampaignLibrary campaigns={campaigns} setCampaigns={setCampaigns} user={user} onLogout={handleLogout} />}
        />
        {user.role === 'admin' && (
          <Route path="/admin" element={<Admin user={user} onLogout={handleLogout} />} />
        )}
      </Routes>
    </Router>
  );
};

export default App;
