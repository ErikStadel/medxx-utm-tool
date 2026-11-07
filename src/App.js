import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Copy, Search, Archive, Plus, Trash2, Edit3, Check, X, Menu, AlertTriangle, AlertCircle, CheckCircle, Info } from 'lucide-react';
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

  // Erlaubte Zeichen: a-z, 0-9, _, {, }, %
  const invalidChars = trimmedValue.match(/[^a-z0-9_{}%]/g);
  if (invalidChars) {
    const uniqueInvalidChars = [...new Set(invalidChars)];
    errors.push(`Ungültige Zeichen: ${uniqueInvalidChars.join(', ')} (nur a-z, 0-9, _, {}, % erlaubt)`);
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
    // Detaillierte Analyse des Formats
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
    // Erfolgreiche Validierung - zusätzliche Warnungen
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
  // Flexiblere Validierung für UTM Builder

  // Placeholder-Validierung
  const placeholderPattern = /\{[^}]*\}/g;
  const placeholders = value.match(placeholderPattern) || [];

  placeholders.forEach(placeholder => {
    if (placeholder === '{}') {
      errors.push('Leere Platzhalter {} sind nicht erlaubt');
    }
    // Prüfe auf gängige Placeholder-Namen
    const commonPlaceholders = ['{campaign}', '{keyword}', '{placement}', '{adgroup}', '{device}'];
    const placeholderName = placeholder.toLowerCase();
    if (!commonPlaceholders.includes(placeholderName) && !/\{[a-z_][a-z0-9_]*\}/.test(placeholderName)) {
      warnings.push(`Ungewöhnlicher Platzhalter: ${placeholder}`);
    }
  });

  // Lizenz-Suche Validierung
  if (value.includes('%')) {
    const percentCount = (value.match(/%/g) || []).length;
    if (percentCount > 1) {
      errors.push('Nur ein % für Lizenzsuche erlaubt');
    }

    const percentIndex = value.indexOf('%');
    const beforePercent = value.substring(0, percentIndex);
    const afterPercent = value.substring(percentIndex + 1);

    if (beforePercent.endsWith('_') && afterPercent === '') {
      // Korrekt: "2025_08_%" für Lizenzsuche
    } else if (afterPercent.length > 0) {
      // Lizenzsuche mit bereits eingegebenem Suchbegriff
      if (!/^[a-z0-9_]*$/.test(afterPercent)) {
        errors.push('Suchbegriff nach % darf nur Kleinbuchstaben, Zahlen und Unterstriche enthalten');
      }
    } else if (!beforePercent.endsWith('_')) {
      warnings.push('% sollte nach einem Unterstrich für bessere Lesbarkeit stehen');
    }
  }

  // Struktur-Warnungen
  if (!value.includes('_') && !placeholders.length && !value.includes('%')) {
    warnings.push('Kampagne sollte strukturiert sein (z.B. mit Unterstrichen)');
  }

  if (value.length < 3) {
    warnings.push('Sehr kurzer Kampagnenname');
  }

  if (value.length > 100) {
    errors.push('Kampagnenname ist zu lang (max. 100 Zeichen)');
  }

  // Doppelte Unterstriche
  if (value.includes('__')) {
    errors.push('Doppelte Unterstriche sind nicht erlaubt');
  }

  // Beginn/Ende mit Unterstrich
  if (value.startsWith('_') || value.endsWith('_')) {
    errors.push('Kampagnenname darf nicht mit Unterstrich beginnen oder enden');
  }

  // Numerische Sequenzen am Ende (häufiger Fehler)
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
    // Ausnahme für vordefinierte Werte bei Facebook Ads und Tiktok Ads
    if (field === 'content' && (selectedChannel === 'Facebook Ads' || selectedChannel === 'Tiktok Ads')) {
      const allowedDatalistValues = ['{{placement}}', '__PLACEMENT__'];
      if (allowedDatalistValues.includes(value)) {
        return validationResult; // Keine Fehler, wenn vordefinierter Wert
      }
    }

    // Standard-Validierung für andere Fälle
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

// Kampagnen-Input Komponente mit Live-Vorschau
const CampaignInput = ({
  value,
  isLoading,
  onChange,
  onFocus,
  validationErrors,
  isLibraryScreen = false,
  showPreview = false,
  campaignDropdownRef,
  showCampaignDropdown,
  campaignSearchTerm,
  setCampaignSearchTerm,
  filteredCampaigns,
  handleCampaignSelect,
  handleCampaignSearchChange,
  sortedCampaigns,
  setFilteredCampaigns,
  setShowCampaignDropdown,
  licenseDropdownRef,
  showLicenseDropdown,
  licenseSuggestions,
  handleLicenseSelect,
  getSearchTerm
}) => {
  const getFormatExample = () => {
    if (isLibraryScreen) {
      const currentYear = new Date().getFullYear();
      const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
      return `${currentYear}_${currentMonth}_urlaubsrabatt_01`;
    }
    return "land_bezeichner, YYYY_MM_aktion oder % für Lizenzsuche";
  };

  const getFormatHelp = () => {
    if (isLibraryScreen) {
      return "Format: YYYY_MM_aktion[_variante]";
    }
    return "Kleinbuchstaben, Zahlen, Unterstriche, {} und % (z.B. de_dd_black_week)";
  };

  const analyzeFormat = () => {
    if (!value || isLibraryScreen) return null;

    const parts = value.split('_');
    const analysis = [];

    // Flexiblere Analyse ohne Annahme von Jahr/Monat
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

  const highlightText = (text, searchTerm) => {
    if (!searchTerm || !text) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ?
        <mark key={index} className="bg-yellow-300 text-black px-1 rounded">{part}</mark> :
        part
    );
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

          {showLicenseDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-[var(--card-background)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto" ref={licenseDropdownRef}>
              {licenseSuggestions.map((license, index) => (
                <div
                  key={`${license.id}-${index}`}
                  className="grid grid-cols-2 px-4 py-2 hover:bg-[var(--secondary-color)] cursor-pointer text-sm border-b border-[var(--border-color)] last:border-b-0"
                  onClick={() => handleLicenseSelect(license.utm_writing, getSearchTerm())}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {highlightText(license.name, getSearchTerm().toLowerCase())}
                    </span>
                    <span className="text-xs text-gray-400">
                      {license.category}
                      {license.tags && ` • ${license.tags}`}
                    </span>
                  </div>
                  <span className="text-right font-mono text-xs">
                    {highlightText(license.utm_writing, getSearchTerm().toLowerCase())}
                  </span>
                </div>
              ))}
              {licenseSuggestions.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-500">
                  Keine Ergebnisse für "{getSearchTerm()}"
                </div>
              )}
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
              console.log('onFocus - setting filteredCampaigns:', campaigns);
              setFilteredCampaigns(campaigns);
            }}
            className="w-full"
            placeholder="Aus Bibliothek wählen"
          />
          {showCampaignDropdown && (
            <div className="absolute z-10 w-full mt-1 bg-[var(--card-background)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {isLoading ? (
                <div className="px-4 py-2 text-sm text-gray-500">Kampagnen werden geladen...</div>
              ) : Array.isArray(filteredCampaigns) && filteredCampaigns.length > 0 ? (
                filteredCampaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="px-4 py-2 hover:bg-[var(--hover-background)] cursor-pointer"
                    onClick={() => handleCampaignSelect(campaign.name)}
                  >
                    {campaign.name}
                  </div>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  {Array.isArray(sortedCampaigns) && sortedCampaigns.length === 0
                    ? 'Keine nicht-archivierten Kampagnen verfügbar'
                    : 'Keine Kampagnen gefunden'}
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

const Login = ({ onLogin }) => {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/users/validate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Login fehlgeschlagen');
      }
      onLogin(await res.json());
    } catch (err) {
      setError(err.message);
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
      <div className="card p-8 w-full max-w-md">
        <h1 className="text-2xl mb-4 text-center">Login</h1>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.toLowerCase())}
          onKeyDown={handleKeyDown}
          placeholder="Dein Name"
          className="mb-4 w-full"
          autoFocus
        />
        {error && <p className="error-message mb-2 text-center">{error}</p>}
        <button onClick={handleLogin} className="primary w-full">Anmelden</button>
      </div>
    </div>
  );
};

const Admin = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({ name: '', role: 'standard' });
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
      setNewUser({ name: '', role: 'standard' });
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
          <h1 className="text-2xl mb-4 text-center">Admin-Login</h1>
          <input
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Admin-Passwort"
            className="mb-4 w-full"
            autoFocus
          />
          {error && <p className="error-message mb-2 text-center">{error}</p>}
          <button onClick={handleAdminLogin} className="primary w-full" disabled={isLoading}>
            {isLoading ? 'Lädt...' : 'Anmelden'}
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
          <Link to="/" className="icon">
            <X size={24} />
          </Link>
        </div>
      </header>
      <div className="container content-container">
        <div className="card">
          <h2 className="text-xl mb-4">Neuen Nutzer hinzufügen</h2>
          <div className="space-y-4 mb-6">
            <input
              type="text"
              value={newUser.name}
              onChange={(e) => setNewUser({ ...newUser, name: e.target.value.toLowerCase() })}
              placeholder="Name"
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
                    <tr key={u.id} className={`border-t ${index % 2 === 0 ? 'bg-gray-600' : ''}`}>
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
                          <select
                            value={editingUser.role}
                            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                            className="w-full p-1 border rounded-lg"
                          >
                            <option value="standard">Standard</option>
                            <option value="admin">Admin</option>
                          </select>
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
                                onClick={() => setEditingUser({ id: u.id, name: u.name, role: u.role })}
                                className="icon text-blue-300"
                                disabled={isLoading}
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(u.id)}
                                className="danger icon"
                                disabled={isLoading}
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
                    className="secondary px-4 py-2 rounded-lg"
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

const UTMBuilder = ({ campaigns, setCampaigns, user }) => {
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [licenseSuggestions, setLicenseSuggestions] = useState([]);
  const [showLicenseDropdown, setShowLicenseDropdown] = useState(false);
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('');
  const [showCampaignDropdown, setShowCampaignDropdown] = useState(false);
  const [filteredCampaigns, setFilteredCampaigns] = useState([]);
  const [licenseSearchCache] = useState(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [licenseSearchAbortController, setLicenseSearchAbortController] = useState(null);

  const campaignDropdownRef = useRef(null);
  const licenseDropdownRef = useRef(null);

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

  const fetchLicenses = useCallback(async (searchTerm) => {
    const cacheKey = searchTerm ? searchTerm.toLowerCase() : 'all';
    if (licenseSearchCache.has(cacheKey)) {
      const cachedResults = licenseSearchCache.get(cacheKey);
      setLicenseSuggestions(cachedResults);
      setShowLicenseDropdown(cachedResults.length > 0);
      return;
    }

    if (licenseSearchAbortController) {
      licenseSearchAbortController.abort();
    }

    const controller = new AbortController();
    setLicenseSearchAbortController(controller);

    try {
      const url = searchTerm
        ? `/api/licenses?search=${encodeURIComponent(searchTerm)}`
        : `/api/licenses`;
      const response = await fetch(url, {
        credentials: 'include',
        signal: controller.signal
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const licenses = Array.isArray(data) ? data : Object.values(data).flat();

      if (licenseSearchCache.size >= 50) {
        const firstKey = licenseSearchCache.keys().next().value;
        licenseSearchCache.delete(firstKey);
      }
      licenseSearchCache.set(cacheKey, licenses);

      setLicenseSuggestions(licenses);
      setShowLicenseDropdown(licenses.length > 0);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Fehler beim Laden der Lizenzen:', error.message);
        setLicenseSuggestions([]);
        setShowLicenseDropdown(false);
      }
    } finally {
      setLicenseSearchAbortController(null);
    }
  }, [licenseSearchCache, licenseSearchAbortController]);

  const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  };

  const debouncedFetchLicenses = useCallback(
    (searchTerm) => debounce(fetchLicenses, 200)(searchTerm),
    [fetchLicenses]
  );

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/campaigns', { credentials: 'include' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('Loaded campaigns:', data);
        setCampaigns(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Fehler beim Laden der Kampagnen:', error.message);
        setCampaigns([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCampaigns();
  }, [setCampaigns]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (campaignDropdownRef.current && !campaignDropdownRef.current.contains(event.target)) {
        setShowCampaignDropdown(false);
        setCampaignSearchTerm('');
      }
      if (licenseDropdownRef.current && !licenseDropdownRef.current.contains(event.target)) {
        setShowLicenseDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (licenseSearchAbortController) {
        licenseSearchAbortController.abort();
      }
    };
  }, [licenseSearchAbortController]);

  const sortedCampaigns = useMemo(() =>
    (Array.isArray(campaigns) ? campaigns : []).filter(c => !c.archived).sort((a, b) => b.id - a.id),
    [campaigns]
  );

  const handleChannelChange = (channel) => {
    setSelectedChannel(channel);
    const channelData = channels[channel];
    setUtmParams(prev => ({
      ...prev,
      source: channelData.sourceEditable || channelData.sourceDropdown ? '' : channelData.source,
      medium: channelData.medium,
      term: channelData.showTerm ? '{keyword}' : '',
      customParams: ''
    }));
    setValidationErrors({});
  };

  const handleParamChange = (field, value) => {
    setUtmParams(prev => ({ ...prev, [field]: value }));

    if (field === 'campaign') {
      const errors = validateNomenclature(value, field, false, selectedChannel);
      setValidationErrors(prev => ({
        ...prev,
        [field]: errors[field] || null,
        [field + '_warning']: errors[field + '_warning'] || null
      }));

      if (value.includes('%')) {
        const parts = value.split('%');
        const searchTerm = parts.length > 1 ? parts[1] : '';
        debouncedFetchLicenses(searchTerm);
      } else {
        setShowLicenseDropdown(false);
        setLicenseSuggestions([]);
      }
    } else {
      const errors = validateNomenclature(value, field, false, selectedChannel);
      setValidationErrors(prev => ({ ...prev, ...errors, [field]: errors[field] || null }));
    }
  };

  const handleLicenseSelect = (utmWriting, searchTerm) => {
    setUtmParams(prev => ({
      ...prev,
      campaign: prev.campaign.replace(`%${searchTerm}`, utmWriting)
    }));
    setShowLicenseDropdown(false);
    setValidationErrors({});
  };

  const handleCampaignSearchChange = (e) => {
    const value = e.target.value;
    setCampaignSearchTerm(value);

    const campaigns = Array.isArray(sortedCampaigns) ? sortedCampaigns : [];
    if (value.length >= 2) {
      const filtered = campaigns.filter(c =>
        c.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCampaigns(filtered);
    } else {
      setFilteredCampaigns(campaigns);
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
        if (pair.includes('=')) {
          parts.push(pair);
        }
      }
    }

    return parts.join('&');
  };

  // Neuen State für Copy-Success der Tracking Template hinzufügen:
  const [copyTemplateSuccess, setCopyTemplateSuccess] = useState(false);

  // Neue Copy-Funktion für Tracking Template:
  const copyTrackingTemplateToClipboard = async () => {
    const template = generateTrackingTemplate();
    if (template) {
      try {
        await navigator.clipboard.writeText(template);
        setCopyTemplateSuccess(true);
        setTimeout(() => setCopyTemplateSuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy tracking template: ', err);
      }
    }
  };


  const generateUrl = () => {
    if (!baseUrl || !utmParams.source || !utmParams.medium || !utmParams.campaign) return '';

    const parts = [];
    parts.push(`utm_source=${utmParams.source}`);
    parts.push(`utm_medium=${utmParams.medium}`);
    parts.push(`utm_campaign=${utmParams.campaign}`);
    if (utmParams.content) parts.push(`utm_content=${utmParams.content}`);
    if (utmParams.term && channels[selectedChannel]?.showTerm) parts.push(`utm_term=${utmParams.term}`);

    if (utmParams.customParams) {
      const customPairs = utmParams.customParams.split('&').map(pair => pair.trim());
      for (const pair of customPairs) {
        if (pair.includes('=')) {
          parts.push(pair);
        }
      }
    }

    return `${baseUrl}?${parts.join('&')}`;
  };

  const copyToClipboard = async () => {
    const url = generateUrl();
    if (url) {
      try {
        await navigator.clipboard.writeText(url);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    }
  };

  const hasValidationErrors = Object.values(validationErrors).some(error => error !== null && error !== undefined && !error.endsWith('_warning'));
  const canGenerateUrl = selectedChannel && utmParams.source && utmParams.medium && utmParams.campaign && !hasValidationErrors;

  const getSearchTerm = () => {
    const parts = utmParams.campaign.split('%');
    return parts.length > 1 ? parts[1] : '';
  };

  return (
    <div className="min-h-screen bg-[var(--background-color)] relative">
      <header className="bg-[var(--card-background)] border-b border-[var(--border-color)] p-4">
        <div className="container flex justify-between items-center">
          <h1>medxx UTM Parameter Builder</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Eingeloggt als: {user.name}</span>
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
        <Link to="/licenses" onClick={() => setMenuOpen(false)} className="menu-item">Lizenzen</Link>
        {user.role === 'admin' && (
          <Link to="/admin" onClick={() => setMenuOpen(false)} className="menu-item">Admin</Link>
        )}
      </div>

      <div className="container content-container relative z-10">
        <div className="card">
          <p>Erstelle konsistente UTM-Parameter für alle Marketing-Channels</p>
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
                          <option value="">-- Plattform wählen --</option>
                          <option value="ig">Instagram</option>
                          <option value="fb">Facebook</option>
                          <option value="tiktok">TikTok</option>
                        </select>
                      ) : (
                        <input type="text" value={utmParams.source} readOnly className="w-full" />
                      )}
                    </div>
                    <div>
                      <label>UTM Medium</label>
                      <input type="text" value={utmParams.medium} readOnly className="w-full" />
                    </div>
                  </div>

                  <CampaignInput
                    value={utmParams.campaign}
                    isLoading={isLoading}
                    sortedCampaigns={sortedCampaigns}
                    onChange={handleParamChange}
                    onFocus={() => setShowLicenseDropdown(false)}
                    validationErrors={validationErrors}
                    isLibraryScreen={false}
                    showPreview={true}
                    campaignDropdownRef={campaignDropdownRef}
                    showCampaignDropdown={showCampaignDropdown}
                    setShowCampaignDropdown={setShowCampaignDropdown}
                    campaignSearchTerm={campaignSearchTerm}
                    handleCampaignSearchChange={handleCampaignSearchChange}
                    filteredCampaigns={filteredCampaigns}
                    setFilteredCampaigns={setFilteredCampaigns}
                    handleCampaignSelect={handleCampaignSelect}
                    licenseDropdownRef={licenseDropdownRef}
                    showLicenseDropdown={showLicenseDropdown}
                    licenseSuggestions={licenseSuggestions}
                    handleLicenseSelect={handleLicenseSelect}
                    getSearchTerm={getSearchTerm}
                  />

                  <div>
                    <label>UTM Content (optional)</label>
                    {selectedChannel === 'Facebook Ads' || selectedChannel === 'Tiktok Ads' ? (
                      <div className="relative">
                        <input
                          type="text"
                          value={utmParams.content}
                          onChange={(e) => handleParamChange('content', e.target.value)}
                          onFocus={() => {
                            setShowCampaignDropdown(false);
                            setShowLicenseDropdown(false);
                          }}
                          className={`w-full ${validationErrors.content ? 'error border-red-500' : ''} appearance-none border border-gray-30 rounded-lg p-2`}
                          placeholder="banner_header"
                          list="contentSuggestions"
                        />
                        {validationErrors.content && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <AlertCircle size={20} className="text-red-500" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={utmParams.content}
                          onChange={(e) => handleParamChange('content', e.target.value)}
                          onFocus={() => {
                            setShowCampaignDropdown(false);
                            setShowLicenseDropdown(false);
                          }}
                          className={`w-full ${validationErrors.content ? 'error border-red-500' : ''}`}
                          placeholder="banner_header"
                        />
                        {validationErrors.content && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <AlertCircle size={20} className="text-red-500" />
                          </div>
                        )}
                      </div>
                    )}

                    {(selectedChannel === 'Facebook Ads' || selectedChannel === 'Tiktok Ads') && (
                      <datalist id="contentSuggestions">
                        {selectedChannel === 'Facebook Ads' && <option value="{{placement}}" />}
                        {selectedChannel === 'Tiktok Ads' && <option value="__PLACEMENT__" />}
                      </datalist>
                    )}

                    <ValidationMessage field="content" errors={validationErrors} className="mt-1" />
                  </div>

                  {channels[selectedChannel]?.showTerm && (
                    <div>
                      <label>UTM Term (für SEA)</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={utmParams.term}
                          onChange={(e) => handleParamChange('term', e.target.value)}
                          onFocus={() => {
                            setShowCampaignDropdown(false);
                            setShowLicenseDropdown(false);
                          }}
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
                        onFocus={() => {
                          setShowCampaignDropdown(false);
                          setShowLicenseDropdown(false);
                        }}
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

const CampaignLibrary = ({ campaigns, setCampaigns, user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [newCampaign, setNewCampaign] = useState({ name: '', category: '', archived: false, inhaber: user.name });
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [copySuccess, setCopySuccess] = useState({}); // State für Kopier-Erfolgsmeldungen pro Kampagne

  const categories = ['Saisonale Aktionen', 'Produktlaunches', 'Gewinnspiele', 'Rabattaktionen', 'Brand Awareness', 'Sonstiges'];

  const addCampaign = async () => {
    if (newCampaign.name && newCampaign.category) {
      const errors = validateNomenclature(newCampaign.name, 'campaign', true);
      if (!errors.campaign) {
        try {
          const response = await fetch('/api/campaigns', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newCampaign.name, category: newCampaign.category, inhaber: newCampaign.inhaber })
          });
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          const newCamp = await response.json();
          setCampaigns(prev => [...prev, newCamp]);
          setNewCampaign({ name: '', category: '', archived: false, inhaber: user.name });
          setValidationErrors({});
        } catch (error) {
          console.error('Fehler beim Hinzufügen der Kampagne:', error.message);
        }
      } else {
        setValidationErrors(errors);
      }
    }
  };

  const deleteCampaign = async (id) => {
    try {
      const response = await fetch('/api/campaigns', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (error) {
      console.error('Fehler beim Löschen der Kampagne:', error.message);
    }
  };

  const toggleArchive = async (id) => {
    const campaign = campaigns.find(c => c.id === id);
    try {
      const response = await fetch('/api/campaigns', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: campaign.name, category: campaign.category, archived: !campaign.archived, inhaber: campaign.inhaber })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const updated = await response.json();
      setCampaigns(prev => prev.map(c => c.id === id ? updated : c));
    } catch (error) {
      console.error('Fehler beim Archivieren der Kampagne:', error.message);
    }
  };

  const updateCampaign = async (id, updatedCampaign) => {
    const errors = validateNomenclature(updatedCampaign.name, 'campaign', true);
    if (errors.campaign) {
      setValidationErrors(errors);
      return;
    }
    try {
      const response = await fetch('/api/campaigns', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: updatedCampaign.name, category: updatedCampaign.category, archived: updatedCampaign.archived, inhaber: updatedCampaign.inhaber })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const updated = await response.json();
      setCampaigns(prev => prev.map(c => c.id === id ? updated : c));
      setEditingCampaign(null);
      setValidationErrors({});
    } catch (error) {
      console.error('Fehler beim Aktualisieren der Kampagne:', error.message);
    }
  };

  const copyCampaignName = async (id, name) => {
    try {
      await navigator.clipboard.writeText(name);
      setCopySuccess(prev => ({ ...prev, [id]: true }));
      setTimeout(() => {
        setCopySuccess(prev => ({ ...prev, [id]: false }));
      }, 2000);
    } catch (error) {
      console.error('Fehler beim Kopieren des Kampagnennamens:', error.message);
    }
  };

  const filteredCampaigns = campaigns.filter((campaign) => {
    const name = (campaign?.name ?? '').toLowerCase();
    const category = (campaign?.category ?? '').toLowerCase();
    const inhaber = (campaign?.inhaber ?? '').toLowerCase();
    const matchesSearch =
      name.includes(searchTerm.toLowerCase()) ||
      category.includes(searchTerm.toLowerCase()) ||
      inhaber.includes(searchTerm.toLowerCase());
    const matchesArchiveFilter = showArchived ? campaign.archived : !campaign.archived;
    return matchesSearch && matchesArchiveFilter;
  });

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <header className="bg-[var(--card-background)] border-b border-[var(--border-color)] p-4">
        <div className="container flex justify-between items-center">
          <h1>Kampagnen-Bibliothek</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Eingeloggt als: {user.name}</span>
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
                    className={`w-full ${validationErrors.campaign ? 'error border red-500' : ''} pr-10`}
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
                    <option value="">Kategorie wählen</option>
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
                    disabled={!newCampaign.name || !newCampaign.category || validationErrors.campaign}
                    className="primary"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mb-6">
              <div className="search-container">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Kampagnen durchsuchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <button
                onClick={() => setShowArchived(!showArchived)}
                className={showArchived ? 'bg-gray-500 text-white' : 'secondary'}
              >
                <Archive size={16} />
              </button>
            </div>

            <div className="campaign-list">
              {filteredCampaigns.map(campaign => (
                <div key={campaign.id} className="campaign-item">
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
                            className={`w-full px-2 py-1 text-sm border border-[var(--border-color)] rounded-lg ${validationErrors.campaign ? 'error border-red-500' : ''} pr-8`}
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
                          disabled={validationErrors.campaign}
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
                          >
                            <Copy size={14} />
                          </button>
                          {copySuccess[campaign.id] && (
                            <span className="ml-2 text-[var(--success-color)] text-xs animate-fade-in">
                              ✓ Kopiert!
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setEditingCampaign(campaign.id)}
                          className="icon text-blue-300"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => toggleArchive(campaign.id)}
                          className={`icon ${campaign.archived ? 'text-blue-600' : 'text-orange-600'}`}
                        >
                          <Archive size={14} />
                        </button>
                        <button
                          onClick={() => deleteCampaign(campaign.id)}
                          className="danger"
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

const Licenses = ({ user }) => {
  const [licenses, setLicenses] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLicense, setNewLicense] = useState({ category: '', tags: '', name: '', utm_writing: '' });
  const [validationErrors, setValidationErrors] = useState({});
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLicense, setEditLicense] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState(null); // Neuer State für Copy-Meldung

  const fetchLicenses = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/licenses?search=${encodeURIComponent(searchTerm)}`, { credentials: 'include' });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();

      if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
        setLicenses(data);
      } else {
        console.error('Unerwartetes Datenformat:', data);
        setLicenses({});
      }
    } catch (error) {
      console.error('Fehler beim Laden der Lizenzen:', error.message);
      setLicenses({});
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchLicenses();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [fetchLicenses]);

  const handleFilter = (category) => {
    setSearchTerm(category);
  };

  const resetForm = () => {
    setNewLicense({ category: '', tags: '', name: '', utm_writing: '' });
    setValidationErrors({});
  };

  const validateLicense = (license) => {
    const errors = {};
    if (!license.category?.trim()) errors.category = 'Kategorie ist erforderlich';
    if (!license.name?.trim()) errors.name = 'Name ist erforderlich';
    if (!license.utm_writing?.trim()) errors.utm_writing = 'UTM-Schreibweise ist erforderlich';
    return errors;
  };

  const showSuccess = () => {
    setShowSuccessDialog(true);
    setTimeout(() => setShowSuccessDialog(false), 2000);
  };

  const handleAddLicense = async () => {
    const errors = validateLicense(newLicense);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/licenses', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newLicense.category.trim(),
          tags: newLicense.tags.trim() || null,
          name: newLicense.name.trim(),
          utm_writing: newLicense.utm_writing.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unbekannter Fehler');
      }

      await fetchLicenses();
      setShowAddModal(false);
      resetForm();
      showSuccess();
    } catch (error) {
      console.error('Fehler beim Hinzufügen:', error.message);
      setValidationErrors({ general: `Fehler beim Hinzufügen: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditLicense = async () => {
    if (!editLicense?.id) {
      setValidationErrors({ general: 'Keine gültige Lizenz zum Bearbeiten' });
      return;
    }

    const errors = validateLicense(editLicense);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/licenses', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editLicense.id,
          category: editLicense.category.trim(),
          tags: editLicense.tags?.trim() || null,
          name: editLicense.name.trim(),
          utm_writing: editLicense.utm_writing.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unbekannter Fehler');
      }

      await fetchLicenses();
      setShowEditModal(false);
      setEditLicense(null);
      setValidationErrors({});
      showSuccess();
    } catch (error) {
      console.error('Fehler beim Bearbeiten:', error.message);
      setValidationErrors({ general: `Fehler beim Bearbeiten: ${error.message}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLicense = async (id) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/licenses', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unbekannter Fehler');
      }

      await fetchLicenses();
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Fehler beim Löschen:', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLicense = async (utmWriting, id) => {
    try {
      await navigator.clipboard.writeText(utmWriting);
      setCopySuccess(id);
      setTimeout(() => setCopySuccess(null), 2000);
    } catch (error) {
      console.error('Fehler beim Kopieren:', error.message);
    }
  };

  const openEditModal = (license) => {
    console.log('Opening edit modal for license:', license);
    const categoryFromContext = Object.keys(licenses).find(cat =>
      licenses[cat] && licenses[cat].some(l => l.id === license.id)
    );
    const licenseData = {
      id: license.id,
      category: license.category || categoryFromContext || '',
      tags: license.tags || '',
      name: license.name || '',
      utm_writing: license.utm_writing || ''
    };
    console.log('Setting edit license data:', licenseData);
    setEditLicense(licenseData);
    setShowEditModal(true);
    setValidationErrors({});
  };

  const uniqueCategories = Object.keys(licenses).filter(cat => cat && cat.trim() !== '');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showEditModal && editLicense) {
        handleEditLicense();
      } else if (showAddModal) {
        handleAddLicense();
      }
    } else if (e.key === 'Escape') {
      if (showEditModal) {
        setShowEditModal(false);
        setEditLicense(null);
        setValidationErrors({});
      } else if (showAddModal) {
        setShowAddModal(false);
        resetForm();
      }
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <header className="bg-[var(--card-background)] border-b border-[var(--border-color)] p-4">
        <div className="container flex justify-between items-center">
          <h1>Lizenzen</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm">Eingeloggt als: {user.name}</span>
            <Link to="/" className="icon"><X size={24} /></Link>
          </div>
        </div>
      </header>
      <div className="container content-container">
        <div className="card">
          <div className="mb-10">
            <div className="search-container flex items-center justify-between">
              <div className="flex items-center flex-1">
                <Search size={16} className="search-icon" />
                <input
                  type="text"
                  placeholder="Suche nach Kategorie, Name oder Tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                  disabled={isLoading}
                />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="danger icon ml-2"
                  disabled={isLoading}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {uniqueCategories.length > 0 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {uniqueCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => handleFilter(cat)}
                    className="px-3 py-1 bg-[var(--secondary-color)] text-sm rounded-lg hover:bg-opacity-80"
                    disabled={isLoading}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="primary mb-4 flex items-center"
            disabled={isLoading}
          >
            <Plus size={16} /> Neue Lizenz
          </button>
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onKeyDown={handleKeyDown}>
              <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Neue Lizenz hinzufügen</h2>
                <div className="space-y-4">
                  <div>
                    <input
                      type="text"
                      placeholder="Kategorie *"
                      value={newLicense.category}
                      onChange={(e) => setNewLicense({ ...newLicense, category: e.target.value })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.category ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                      autoFocus
                    />
                    {validationErrors.category && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.category}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Tags (optional)"
                      value={newLicense.tags}
                      onChange={(e) => setNewLicense({ ...newLicense, tags: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Name *"
                      value={newLicense.name}
                      onChange={(e) => setNewLicense({ ...newLicense, name: e.target.value })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.name ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="UTM-Schreibweise *"
                      value={newLicense.utm_writing}
                      onChange={(e) => setNewLicense({ ...newLicense, utm_writing: e.target.value })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.utm_writing ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                    {validationErrors.utm_writing && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.utm_writing}</p>
                    )}
                  </div>
                  {validationErrors.general && (
                    <p className="text-red-500 text-sm">{validationErrors.general}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleAddLicense}
                      className="primary px-4 py-2 rounded-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Wird hinzugefügt...' : 'Hinzufügen'}
                    </button>
                    <button
                      onClick={() => {
                        setShowAddModal(false);
                        resetForm();
                      }}
                      className="danger px-4 py-2 rounded-lg"
                      disabled={isLoading}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showEditModal && editLicense && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onKeyDown={handleKeyDown}>
              <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Lizenz bearbeiten</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Kategorie *</label>
                    <input
                      type="text"
                      placeholder="Kategorie *"
                      value={editLicense.category || ''}
                      onChange={(e) => setEditLicense({ ...editLicense, category: e.target.value })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.category ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                      autoFocus
                    />
                    {validationErrors.category && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.category}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Tags (optional)</label>
                    <input
                      type="text"
                      placeholder="Tags (optional)"
                      value={editLicense.tags || ''}
                      onChange={(e) => setEditLicense({ ...editLicense, tags: e.target.value })}
                      className="w-full p-2 border rounded-lg"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Name *</label>
                    <input
                      type="text"
                      placeholder="Name *"
                      value={editLicense.name || ''}
                      onChange={(e) => setEditLicense({ ...editLicense, name: e.target.value })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.name ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                    {validationErrors.name && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">UTM-Schreibweise *</label>
                    <input
                      type="text"
                      placeholder="UTM-Schreibweise *"
                      value={editLicense.utm_writing || ''}
                      onChange={(e) => setEditLicense({ ...editLicense, utm_writing: e.target.value })}
                      className={`w-full p-2 border rounded-lg ${validationErrors.utm_writing ? 'border-red-500' : ''}`}
                      disabled={isLoading}
                    />
                    {validationErrors.utm_writing && (
                      <p className="text-red-500 text-sm mt-1">{validationErrors.utm_writing}</p>
                    )}
                  </div>
                  {validationErrors.general && (
                    <p className="text-red-500 text-sm">{validationErrors.general}</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleEditLicense}
                      className="primary px-4 py-2 rounded-lg"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Wird gespeichert...' : 'Speichern'}
                    </button>
                    <button
                      onClick={() => {
                        setShowEditModal(false);
                        setValidationErrors({});
                        setEditLicense(null);
                      }}
                      className="danger px-4 py-2 rounded-lg"
                      disabled={isLoading}
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {showSuccessDialog && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg w-full max-w-md text-center">
                <div className="text-green-500 mb-2">
                  <Check size={32} className="mx-auto" />
                </div>
                <p>Vorgang erfolgreich abgeschlossen!</p>
              </div>
            </div>
          )}
          {copySuccess && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg w-full max-w-md text-center">
                <div className="text-green-500 mb-2">
                  <Check size={32} className="mx-auto" />
                </div>
                <p>✓ Kopiert</p>
              </div>
            </div>
          )}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg w-full max-w-md text-center">
                <h2 className="text-lg font-semibold mb-4">Lizenz löschen</h2>
                <p>Sind Sie sicher, dass Sie diese Lizenz löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.</p>
                <div className="flex gap-2 justify-center mt-4">
                  <button
                    onClick={() => handleDeleteLicense(showDeleteConfirm)}
                    className="danger px-4 py-2 rounded-lg"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Wird gelöscht...' : 'Ja, löschen'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(null)}
                    className="secondary px-4 py-2 rounded-lg"
                    disabled={isLoading}
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            </div>
          )}
          {isLoading && (
            <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
              <div className="bg-[var(--card-background)] p-4 rounded-lg">
                <p>Lädt...</p>
              </div>
            </div>
          )}
          {uniqueCategories.length > 0 ? (
            uniqueCategories.map(category => (
              <div key={category} className="mb-8">
                <h2 className="text-xl font-semibold mb-4 text-center">{category}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse table-fixed min-w-full">
                    <thead>
                      <tr className="bg-[var(--card-background)]">
                        <th className="border p-2 text-left w-1/4">Name</th>
                        <th className="border p-2 text-left w-1/4">Tags</th>
                        <th className="border p-2 text-left w-1/4">UTM-Schreibweise</th>
                        <th className="border p-2 text-center w-1/4">Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(licenses[category] || []).map((license, index) => (
                        <tr key={license.id || index} className={`border-t ${index % 2 === 0 ? 'bg-gray-600' : ''}`}>
                          <td className="p-2 break-words">{license.name}</td>
                          <td className="p-2 break-words">{license.tags || '-'}</td>
                          <td className="p-2 break-words">{license.utm_writing}</td>
                          <td className="p-2">
                            <div className="flex gap-2 justify-center">
                              <button
                                onClick={() => openEditModal(license)}
                                className="icon p-1 text-blue-300"
                                title="Bearbeiten"
                                disabled={isLoading}
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleCopyLicense(license.utm_writing, license.id)}
                                className={`icon p-1 ${copySuccess === license.id ? 'text-green-500' : 'text-blue-300'}`}
                                title="Kopieren"
                                disabled={isLoading}
                              >
                                <Copy size={16} />
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(license.id)}
                                className="danger icon p-1"
                                title="Löschen"
                                disabled={isLoading}
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 py-8">
              {isLoading ? 'Lädt Lizenzen...' : 'Keine Lizenzen gefunden'}
            </div>
          )}
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
        console.error('Fehler beim Validieren des Tokens:', err);
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
          element={<UTMBuilder campaigns={campaigns} setCampaigns={setCampaigns} user={user} />}
        />
        <Route
          path="/library"
          element={<CampaignLibrary campaigns={campaigns} setCampaigns={setCampaigns} user={user} />}
        />
        <Route path="/licenses" element={<Licenses user={user} />} />
        {user.role === 'admin' && (
          <Route path="/admin" element={<Admin user={user} />} />
        )}
      </Routes>
    </Router>
  );
};

export default App;
