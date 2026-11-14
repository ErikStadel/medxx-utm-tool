import React, { useMemo, useState } from 'react';
import { Copy, Check, Trash2, Search, ExternalLink } from 'lucide-react';
import LayoutHeader from './LayoutHeader';
import { ALLOWED_MEDIUMS } from '../utils/utmValidation';

const SavedLinks = ({ links = [], setLinks, user, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mediumFilter, setMediumFilter] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const filteredLinks = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return links.filter((link) => {
      if (mediumFilter && link.utm_medium !== mediumFilter) return false;
      if (onlyMine && link.created_by !== user.name) return false;
      if (!q) return true;
      return (
        (link.full_url || '').toLowerCase().includes(q) ||
        (link.utm_campaign || '').toLowerCase().includes(q) ||
        (link.utm_source || '').toLowerCase().includes(q) ||
        (link.utm_content || '').toLowerCase().includes(q) ||
        (link.shortlink_url || '').toLowerCase().includes(q) ||
        (link.note || '').toLowerCase().includes(q) ||
        (link.created_by || '').toLowerCase().includes(q)
      );
    });
  }, [links, searchTerm, mediumFilter, onlyMine, user.name]);

  const handleCopy = async (id, text, type) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(`${id}-${type}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Gespeicherten Link wirklich löschen?')) return;
    try {
      setError('');
      const res = await fetch('/api/links', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }
      setLinks((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <LayoutHeader title="Gespeicherte UTM-Links" user={user} onLogout={onLogout} />

      <div className="container content-container">
        <div className="card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="mb-1">Alle gespeicherten Links ({filteredLinks.length})</h2>
              <p className="text-sm text-gray-300 mb-0">
                Zentrale Historie aller im Tool erstellten und gespeicherten UTM-URLs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
            <div className="relative md:col-span-2">
              <input
                type="text"
                placeholder="Suchen nach Kampagne, Source, URL, Notiz, Shortlink oder Ersteller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="flex-1"
              >
                <option value="">Alle Mediums</option>
                {ALLOWED_MEDIUMS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm whitespace-nowrap mb-0 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-auto"
                  checked={onlyMine}
                  onChange={(e) => setOnlyMine(e.target.checked)}
                />
                Nur meine
              </label>
            </div>
          </div>

          {error && <div className="validation-message error-message">{error}</div>}

          <div className="space-y-3">
            {filteredLinks.map((link) => {
              const canDelete = user.role === 'admin' || link.created_by === user.name;
              const formattedDate = link.created_at
                ? new Date(link.created_at).toLocaleString('de-DE', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '';

              return (
                <div
                  key={link.id}
                  className="p-4 rounded-lg bg-gray-800/70 border border-[var(--border-color)] space-y-2"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2 py-0.5 rounded bg-blue-900/60 text-blue-200 font-mono">
                          {link.utm_medium}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-900/60 text-purple-200 font-mono">
                          {link.utm_source}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 font-mono">
                          {link.utm_campaign}
                        </span>
                        {link.utm_content && (
                          <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-200 font-mono">
                            {link.utm_content}
                          </span>
                        )}
                        {link.utm_term && (
                          <span className="px-2 py-0.5 rounded bg-amber-900/50 text-amber-200 font-mono">
                            term={link.utm_term}
                          </span>
                        )}
                      </div>

                      {link.note && <div className="text-sm font-medium text-white">{link.note}</div>}

                      {link.shortlink_url && (
                        <div className="text-xs text-blue-300 flex items-center gap-1">
                          <ExternalLink size={12} />
                          Shortlink: <code>{link.shortlink_url}</code>
                        </div>
                      )}

                      <div className="text-xs font-mono text-gray-300 break-all bg-gray-900/70 p-2 rounded border border-gray-700">
                        {link.full_url}
                      </div>

                      <div className="text-xs text-gray-400">
                        Erstellt von <span className="text-gray-200">{link.created_by}</span>
                        {formattedDate ? ` • ${formattedDate}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(link.id, link.full_url, 'url')}
                        className="secondary text-xs flex items-center gap-1 py-1.5 px-2.5"
                        title="Vollständige URL kopieren"
                      >
                        {copiedId === `${link.id}-url` ? <Check size={14} /> : <Copy size={14} />}
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(link.id, link.tracking_template, 'tpl')}
                        className="secondary text-xs flex items-center gap-1 py-1.5 px-2.5"
                        title="Nur Parameter kopieren"
                      >
                        {copiedId === `${link.id}-tpl` ? <Check size={14} /> : <Copy size={14} />}
                        Params
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(link.id)}
                          className="danger icon"
                          title="Link löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredLinks.length === 0 && (
              <p className="text-center text-gray-400 py-8 mb-0">
                Keine gespeicherten Links gefunden. Erstelle im UTM Builder einen Link und klicke auf „Link speichern“.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SavedLinks;
