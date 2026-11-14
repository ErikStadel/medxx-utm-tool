import React, { useMemo, useState } from 'react';
import { Plus, Trash2, AlertCircle, CheckCircle2, Lock, Power, Search } from 'lucide-react';
import LayoutHeader from './LayoutHeader';
import {
  SOURCE_CATEGORY_LABELS,
  buildSourceSlug,
  isDynamicPlatformToken,
  normalizeSlug,
  validateSlugModule,
  validateUtmSource,
} from '../utils/utmValidation';

const COMPONENT_TABS = [
  { key: 'partner_event', label: 'Partner & Messen' },
  { key: 'sources_admin', label: 'Sources & Fachportale' },
  { key: 'topic', label: 'Themen (Campaign)' },
  { key: 'audience', label: 'Zielgruppen (Campaign)' },
  { key: 'angle', label: 'Angles (Content)' },
  { key: 'format', label: 'Formate (Content)' },
  { key: 'standards', label: 'System-Standards (Gesperrt)' },
];

const TaxonomyManager = ({
  sources = [],
  setSources,
  components = [],
  setComponents,
  user,
  onLogout,
}) => {
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('partner_event');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Source form state
  const [sourceCategory, setSourceCategory] = useState('partner');
  const [sourceLabel, setSourceLabel] = useState('');
  const [sourceSlug, setSourceSlug] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [usePrefix, setUsePrefix] = useState(false);
  const [defaultMedium, setDefaultMedium] = useState('offline');
  const [listSearch, setListSearch] = useState('');

  // Component form state
  const [compSlug, setCompSlug] = useState('');
  const [compDescription, setCompDescription] = useState('');

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setError('');
    setSuccess('');
    setCompSlug('');
    setCompDescription('');
    setListSearch('');
    if (tabKey === 'partner_event') {
      setSourceCategory('partner');
      setDefaultMedium('offline');
      setUsePrefix(false);
    } else if (tabKey === 'sources_admin') {
      setSourceCategory('publisher');
      setDefaultMedium('advertorial');
      setUsePrefix(false);
    }
    setSourceLabel('');
    setSourceSlug('');
    setSlugEdited(false);
  };

  const handleSourceLabelChange = (val) => {
    setSourceLabel(val);
    if (!slugEdited) {
      setSourceSlug(buildSourceSlug(val, sourceCategory, usePrefix));
    }
  };

  const mediumOptions = useMemo(
    () => components.filter((c) => c.component_type === 'medium' && c.is_active !== false),
    [components]
  );

  const handleCreateSource = async (e) => {
    e.preventDefault();
    const slugErr =
      isAdmin && isDynamicPlatformToken(sourceSlug)
        ? validateUtmSource(sourceSlug)
        : validateSlugModule(sourceSlug, 'Source-Slug');
    if (slugErr) {
      setError(slugErr);
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const res = await fetch('/api/taxonomy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'source',
          slug: sourceSlug,
          label: sourceLabel.trim() || sourceSlug,
          category: sourceCategory,
          default_medium: defaultMedium || null,
          allowed_mediums: defaultMedium ? [defaultMedium] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern');
      setSources((prev) => [...prev, data]);
      setSourceLabel('');
      setSourceSlug('');
      setSlugEdited(false);
      setSuccess(`Source "${data.slug}" gespeichert.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateComponent = async (e) => {
    e.preventDefault();
    const slugErr = validateSlugModule(compSlug, 'Baustein-Slug');
    if (slugErr) {
      setError(slugErr);
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      setSuccess('');
      const res = await fetch('/api/taxonomy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'component',
          component_type: activeTab,
          slug: compSlug,
          label: compSlug,
          description: compDescription.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern');
      setComponents((prev) => [...prev, data]);
      setCompSlug('');
      setCompDescription('');
      setSuccess(`Baustein "${data.slug}" gespeichert.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSourceActive = async (item) => {
    try {
      setError('');
      const res = await fetch('/api/taxonomy', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'source',
          id: item.id,
          is_active: !item.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Aktualisieren');
      setSources((prev) => prev.map((s) => (s.id === item.id ? data : s)));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteSource = async (id) => {
    if (!window.confirm('Source wirklich löschen?')) return;
    try {
      setError('');
      const res = await fetch('/api/taxonomy', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'source', id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleComponentActive = async (item) => {
    try {
      setError('');
      const res = await fetch('/api/taxonomy', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'component',
          id: item.id,
          is_active: !item.is_active,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Aktualisieren');
      setComponents((prev) => prev.map((c) => (c.id === item.id ? data : c)));
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteComponent = async (id) => {
    if (!window.confirm('Baustein wirklich löschen?')) return;
    try {
      setError('');
      const res = await fetch('/api/taxonomy', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: 'component', id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }
      setComponents((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  const displayedSources = useMemo(() => {
    const q = listSearch.trim().toLowerCase();
    const base =
      activeTab === 'partner_event'
        ? sources.filter((s) => s.category === 'partner' || s.category === 'event')
        : activeTab === 'sources_admin'
          ? sources.filter((s) => !['partner', 'event'].includes(s.category))
          : [];
    if (!q) return base;
    return base.filter(
      (s) => s.slug.toLowerCase().includes(q) || s.label.toLowerCase().includes(q)
    );
  }, [sources, activeTab, listSearch]);

  const displayedComponents = useMemo(() => {
    if (activeTab === 'standards') {
      return components.filter((c) => c.component_type === 'medium' || c.component_type === 'funnel');
    }
    return components.filter((c) => c.component_type === activeTab);
  }, [components, activeTab]);

  const isSourceTab = activeTab === 'partner_event' || activeTab === 'sources_admin';
  const canCreateOnTab =
    activeTab === 'partner_event' ||
    (isAdmin && ['sources_admin', 'topic', 'audience', 'angle', 'format'].includes(activeTab));

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <LayoutHeader title="Partner, Messen & Katalog" user={user} onLogout={onLogout} />

      <div className="container content-container">
        <div className="card space-y-6">
          <div>
            <h2 className="mb-1">Neon-Katalog verwalten</h2>
            <p className="text-sm text-[var(--text-muted)] mb-0">
              {isAdmin
                ? 'Als Admin kannst du Partner, Messen, Sources, Themen sowie alle modularen Bausteine verwalten.'
                : 'Standard-Nutzer können hier neue Partner und Messen anlegen. Alle übrigen Bausteine werden von Admins gepflegt.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-[var(--border-color)] pb-4">
            {COMPONENT_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`text-xs md:text-sm px-3.5 py-2 rounded-lg border transition-colors ${
                  activeTab === tab.key
                    ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-sm'
                    : 'bg-[var(--secondary-btn-bg)] border-[var(--border-strong)] text-[var(--text-color)] hover:bg-[var(--secondary-btn-hover)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="validation-message error-message">
              <AlertCircle size={15} className="mr-2 shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="validation-message info-message">
              <CheckCircle2 size={15} className="mr-2 shrink-0" />
              {success}
            </div>
          )}

          {/* Create Form */}
          {canCreateOnTab ? (
            isSourceTab ? (
              <form onSubmit={handleCreateSource} className="section-panel">
                <h3 className="m-0">
                  {activeTab === 'partner_event' ? 'Neuen Partner oder Messe anlegen' : 'Neue Source anlegen (Admin)'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="field-label">Kategorie</label>
                    <select
                      value={sourceCategory}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setSourceCategory(cat);
                        setSlugEdited(false);
                        setSourceSlug(buildSourceSlug(sourceLabel, cat, usePrefix));
                        if (cat === 'partner') setDefaultMedium('offline');
                        else if (cat === 'event') setDefaultMedium('event');
                        else if (cat === 'publisher') setDefaultMedium('advertorial');
                      }}
                    >
                      {activeTab === 'partner_event' ? (
                        <>
                          <option value="partner">Service-Partner</option>
                          <option value="event">Messe / Event</option>
                        </>
                      ) : (
                        <>
                          <option value="publisher">Fachportal / Publisher</option>
                          <option value="digital">Digital</option>
                          <option value="offline">Offline / Print</option>
                          <option value="location">Standort / Niederlassung</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="field-label">Anzeigename</label>
                    <input
                      type="text"
                      value={sourceLabel}
                      onChange={(e) => handleSourceLabelChange(e.target.value)}
                      placeholder={sourceCategory === 'partner' ? 'z. B. Praxis-IT Müller' : 'z. B. Messe Stuttgart'}
                    />
                  </div>
                  <div>
                    <label className="field-label">UTM-Slug (normalisiert)</label>
                    <input
                      type="text"
                      value={sourceSlug}
                      onChange={(e) => {
                        setSlugEdited(true);
                        const val = e.target.value;
                        setSourceSlug(
                          isAdmin && isDynamicPlatformToken(val.trim()) ? val.trim() : normalizeSlug(val)
                        );
                      }}
                      className="font-mono text-sm"
                      placeholder="z. B. partner-mueller"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                  <div>
                    <label className="field-label">Standard-Medium</label>
                    <select value={defaultMedium} onChange={(e) => setDefaultMedium(e.target.value)}>
                      <option value="">-- Kein Standard --</option>
                      {mediumOptions.map((m) => (
                        <option key={m.slug} value={m.slug}>
                          {m.slug}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    {activeTab === 'partner_event' && (
                      <label className="flex items-center gap-2 text-xs mb-0 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-auto"
                          checked={usePrefix}
                          onChange={(e) => {
                            setUsePrefix(e.target.checked);
                            setSlugEdited(false);
                            setSourceSlug(buildSourceSlug(sourceLabel, sourceCategory, e.target.checked));
                          }}
                        />
                        Prefix ({sourceCategory === 'partner' ? 'partner-' : 'messe-'})
                      </label>
                    )}
                    <button type="submit" className="primary flex items-center gap-1.5 ml-auto" disabled={isSaving || !sourceSlug}>
                      <Plus size={16} /> Speichern
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCreateComponent} className="section-panel">
                <h3 className="m-0">Neuen Baustein anlegen ({activeTab})</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="field-label">Slug (wird automatisch normalisiert)</label>
                    <input
                      type="text"
                      value={compSlug}
                      onChange={(e) => setCompSlug(normalizeSlug(e.target.value))}
                      className="font-mono text-sm"
                      placeholder="z. B. regulatorik-2027"
                    />
                  </div>
                  <div>
                    <label className="field-label">Beschreibung / Hilfetext</label>
                    <input
                      type="text"
                      value={compDescription}
                      onChange={(e) => setCompDescription(e.target.value)}
                      placeholder="z. B. Regulatorik-Kampagne 2027"
                    />
                  </div>
                  <div>
                    <button type="submit" className="primary flex items-center gap-1.5" disabled={isSaving || !compSlug}>
                      <Plus size={16} /> Baustein speichern
                    </button>
                  </div>
                </div>
              </form>
            )
          ) : (
            <div className="p-4 rounded-xl bg-[var(--section-background)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] flex items-center gap-2">
              <Lock size={14} />
              {activeTab === 'standards'
                ? 'Mediums und Funnel-Phasen sind feste System-Standards und schreibgeschützt.'
                : 'Nur Admins können Einträge in dieser Kategorie anlegen oder ändern.'}
            </div>
          )}

          {isSourceTab && (
            <div className="relative">
              <input
                type="text"
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                placeholder="Liste durchsuchen (Name oder Tracking-ID)..."
                className="w-full pl-10"
              />
              <Search size={16} className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" />
            </div>
          )}

          {/* Table / List */}
          <div className="space-y-2.5">
            {isSourceTab
              ? displayedSources.map((item) => {
                  const canManage =
                    isAdmin ||
                    (['partner', 'event'].includes(item.category) && item.created_by === user.name);
                  return (
                    <div
                      key={item.id}
                      className={`item-card flex flex-wrap items-center justify-between gap-3 ${
                        item.is_active ? '' : 'opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <code className="code-chip font-semibold">{item.slug}</code>
                          <span className="text-sm font-medium text-[var(--text-color)]">{item.label}</span>
                          <span className="pill-badge pill-gray">
                            {SOURCE_CATEGORY_LABELS[item.category] || item.category}
                          </span>
                          {!item.is_active && <span className="pill-badge pill-red">Inaktiv</span>}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-1">
                          Standard-Medium: {item.default_medium || '—'}
                          {` • Erstellt von: ${item.created_by || 'system'}`}
                        </div>
                      </div>

                      {canManage && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleSourceActive(item)}
                            className="icon text-[var(--warning-color)]"
                            title={item.is_active ? 'Deaktivieren' : 'Aktivieren'}
                          >
                            <Power size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteSource(item.id)}
                            className="danger icon"
                            title="Löschen"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              : displayedComponents.map((item) => (
                  <div
                    key={item.id}
                    className={`item-card flex flex-wrap items-center justify-between gap-3 ${
                      item.is_active ? '' : 'opacity-60'
                    }`}
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="code-chip font-semibold">{item.slug}</code>
                        {activeTab === 'standards' && (
                          <span className="pill-badge pill-gray">{item.component_type}</span>
                        )}
                        {item.is_locked && (
                          <span className="pill-badge pill-gray inline-flex items-center gap-1">
                            <Lock size={11} /> Geschützt
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <div className="text-xs text-[var(--text-muted)] mt-1">{item.description}</div>
                      )}
                    </div>

                    {isAdmin && !item.is_locked && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleComponentActive(item)}
                          className="icon text-[var(--warning-color)]"
                          title={item.is_active ? 'Deaktivieren' : 'Aktivieren'}
                        >
                          <Power size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteComponent(item.id)}
                          className="danger icon"
                          title="Löschen"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaxonomyManager;
