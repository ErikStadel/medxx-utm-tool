import React, { useMemo, useState } from 'react';
import { Copy, Check, Trash2, Search } from 'lucide-react';
import LayoutHeader from './LayoutHeader';

const SavedLinks = ({ links = [], setLinks, components = [], user, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mediumFilter, setMediumFilter] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [error, setError] = useState('');

  const mediumOptions = useMemo(() => {
    const dbMediums = components
      .filter((c) => c.component_type === 'medium' && c.is_active !== false)
      .map((c) => c.slug);
    if (dbMediums.length > 0) return dbMediums;
    return Array.from(new Set(links.map((l) => l.utm_medium).filter(Boolean))).sort();
  }, [components, links]);

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
        <div className="card space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-color)] pb-4">
            <div>
              <h2 className="mb-1">Alle gespeicherten Links ({filteredLinks.length})</h2>
              <p className="text-sm text-[var(--text-muted)] mb-0">
                Zentrale Historie aller im Tool erstellten und gespeicherten UTM-URLs.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="relative md:col-span-2">
              <input
                type="text"
                placeholder="Suchen nach Kampagne, Source, URL, Notiz oder Ersteller..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={mediumFilter}
                onChange={(e) => setMediumFilter(e.target.value)}
                className="flex-1"
              >
                <option value="">Alle Mediums</option>
                {mediumOptions.map((m) => (
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

          <div className="space-y-4">
            {filteredLinks.map((link) => {
              const canDelete = user.role === 'admin' || link.created_by === user.name;
              const formattedDate = link.created_at
                ? new Date(link.created_at).toLocaleString('de-DE', {
                    dateStyle: 'short',
                    timeStyle: 'short',
                  })
                : '';

              return (
                <div key={link.id} className="item-card space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="pill-badge pill-blue font-mono">{link.utm_medium}</span>
                        <span className="pill-badge pill-purple font-mono">{link.utm_source}</span>
                        <span className="pill-badge pill-green font-mono">{link.utm_campaign}</span>
                        {link.utm_content && (
                          <span className="pill-badge pill-gray font-mono">{link.utm_content}</span>
                        )}
                        {link.utm_term && (
                          <span className="pill-badge pill-amber font-mono">term={link.utm_term}</span>
                        )}
                      </div>

                      {link.note && (
                        <div className="text-sm font-semibold text-[var(--text-color)]">{link.note}</div>
                      )}

                      <div className="text-xs font-mono text-[var(--text-color)] break-all bg-[var(--input-background)] p-3 rounded-lg border border-[var(--border-strong)]">
                        {link.full_url}
                      </div>

                      <div className="text-xs text-[var(--text-muted)]">
                        Erstellt von <span className="font-medium text-[var(--text-color)]">{link.created_by}</span>
                        {formattedDate ? ` • ${formattedDate}` : ''}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopy(link.id, link.full_url, 'url')}
                        className="secondary text-xs flex items-center gap-1.5 py-2 px-3"
                        title="Vollständige URL kopieren"
                      >
                        {copiedId === `${link.id}-url` ? <Check size={14} /> : <Copy size={14} />}
                        URL
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(link.id, link.tracking_template, 'tpl')}
                        className="secondary text-xs flex items-center gap-1.5 py-2 px-3"
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
              <p className="text-center text-[var(--text-muted)] py-8 mb-0">
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
