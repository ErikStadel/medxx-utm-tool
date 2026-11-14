import React, { useMemo, useState } from 'react';
import { Copy, Search, Archive, Plus, Trash2, Edit3, Check, X, AlertCircle } from 'lucide-react';
import LayoutHeader from './LayoutHeader';
import CampaignModuleSelector from './CampaignModuleSelector';
import { validateUtmCampaignParts } from '../utils/utmValidation';

const CampaignLibrary = ({ campaigns, setCampaigns, components = [], user, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [funnelFilter, setFunnelFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const [newTopic, setNewTopic] = useState('');
  const [newAudience, setNewAudience] = useState('');
  const [newFunnel, setNewFunnel] = useState('');
  const [newInhaber, setNewInhaber] = useState(user.name);

  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({ topic: '', audience: '', funnel: '', inhaber: user.name });
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState({});

  const byType = useMemo(() => {
    const map = { topic: [], audience: [], funnel: [] };
    components
      .filter((c) => c.is_active !== false)
      .forEach((c) => {
        if (map[c.component_type]) map[c.component_type].push(c);
      });
    return map;
  }, [components]);

  const addCampaign = async () => {
    const err = validateUtmCampaignParts(
      { topic: newTopic, audience: newAudience, funnel: newFunnel },
      byType.funnel.length > 0 ? byType.funnel.map((f) => f.slug) : undefined
    );
    if (err) {
      setError(err);
      return;
    }

    try {
      setError('');
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          topic_slug: newTopic,
          audience_slug: newAudience,
          funnel_slug: newFunnel,
          category: newTopic,
          inhaber: newInhaber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Speichern');
      setCampaigns((prev) => [data, ...prev]);
      setNewTopic('');
      setNewAudience('');
      setNewFunnel('');
      setNewInhaber(user.name);
    } catch (e) {
      setError(e.message);
    }
  };

  const startEdit = (campaign) => {
    const parts = (campaign.name || '').split('_');
    setEditingId(campaign.id);
    setEditDraft({
      topic: campaign.topic_slug || parts[0] || '',
      audience: campaign.audience_slug || parts[1] || '',
      funnel: campaign.funnel_slug || parts[2] || '',
      inhaber: campaign.inhaber || user.name,
      archived: Boolean(campaign.archived),
    });
    setError('');
  };

  const saveEdit = async (id) => {
    const err = validateUtmCampaignParts(
      { topic: editDraft.topic, audience: editDraft.audience, funnel: editDraft.funnel },
      byType.funnel.length > 0 ? byType.funnel.map((f) => f.slug) : undefined
    );
    if (err) {
      setError(err);
      return;
    }

    try {
      setError('');
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id,
          topic_slug: editDraft.topic,
          audience_slug: editDraft.audience,
          funnel_slug: editDraft.funnel,
          category: editDraft.topic,
          archived: editDraft.archived,
          inhaber: editDraft.inhaber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Aktualisieren');
      setCampaigns((prev) => prev.map((c) => (c.id === id ? data : c)));
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleArchive = async (campaign) => {
    try {
      setError('');
      const parts = (campaign.name || '').split('_');
      const res = await fetch('/api/campaigns', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: campaign.id,
          topic_slug: campaign.topic_slug || parts[0],
          audience_slug: campaign.audience_slug || parts[1],
          funnel_slug: campaign.funnel_slug || parts[2],
          category: campaign.category,
          archived: !campaign.archived,
          inhaber: campaign.inhaber,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Archivieren');
      setCampaigns((prev) => prev.map((c) => (c.id === campaign.id ? data : c)));
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteCampaign = async (id) => {
    if (!window.confirm('Kampagne wirklich löschen?')) return;
    try {
      setError('');
      const res = await fetch('/api/campaigns', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Fehler beim Löschen');
      }
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const copyCampaignName = async (id, name) => {
    await navigator.clipboard.writeText(name);
    setCopySuccess((prev) => ({ ...prev, [id]: true }));
    setTimeout(() => setCopySuccess((prev) => ({ ...prev, [id]: false })), 2000);
  };

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || campaign.name.toLowerCase().includes(q);
      const funnelSlug = campaign.funnel_slug || (campaign.name || '').split('_')[2] || '';
      const matchesFunnel = !funnelFilter || funnelSlug === funnelFilter;
      const matchesArchived = showArchived ? campaign.archived : !campaign.archived;
      return matchesSearch && matchesFunnel && matchesArchived;
    });
  }, [campaigns, searchTerm, funnelFilter, showArchived]);

  const canCreate = Boolean(newTopic && newAudience && newFunnel);

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <LayoutHeader title="Kampagnen-Bibliothek" user={user} onLogout={onLogout} />

      <div className="container content-container">
        <div className="card space-y-6">
          <div>
            <h2 className="mb-1">Modulare Kampagnen-Bibliothek</h2>
            <p className="text-sm text-gray-300 mb-0">
              Neue Kampagnen werden ausschließlich über die Bausteine [Thema]_[Zielgruppe]_[Funnel] angelegt.
            </p>
          </div>

          <div className="space-y-4">
            <CampaignModuleSelector
              topic={newTopic}
              audience={newAudience}
              funnel={newFunnel}
              onChangePart={(part, val) => {
                if (part === 'topic') setNewTopic(val);
                else if (part === 'audience') setNewAudience(val);
                else if (part === 'funnel') setNewFunnel(val);
              }}
              topics={byType.topic}
              audiences={byType.audience}
              funnels={byType.funnel}
              showLibraryPicker={false}
            />

            <div className="flex flex-wrap items-center gap-3">
              {user.role === 'admin' && (
                <select
                  value={newInhaber}
                  onChange={(e) => setNewInhaber(e.target.value)}
                  className="w-56"
                >
                  <option value={user.name}>{user.name} (eigene)</option>
                  <option value="alle">Alle (Teamweit)</option>
                </select>
              )}

              <button
                type="button"
                onClick={addCampaign}
                className="primary flex items-center gap-1.5"
                disabled={!canCreate}
              >
                <Plus size={16} /> Kampagne speichern
              </button>
            </div>

            {error && (
              <div className="validation-message error-message">
                <AlertCircle size={15} className="mr-2 shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Filterleiste */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="relative flex-1 min-w-[220px]">
              <input
                type="text"
                placeholder="Kampagnen durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10"
              />
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>

            <select
              value={funnelFilter}
              onChange={(e) => setFunnelFilter(e.target.value)}
              className="w-44"
            >
              <option value="">Alle Funnels</option>
              {byType.funnel.map((f) => (
                <option key={f.slug} value={f.slug}>
                  {f.slug}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 cursor-pointer text-sm mb-0">
              <input
                type="checkbox"
                className="w-auto"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              Archivierte anzeigen
            </label>
          </div>

          <div className="space-y-2">
            {filteredCampaigns.map((campaign) => {
              const canModify = user.role === 'admin' || campaign.inhaber === user.name;
              const isEditing = editingId === campaign.id;

              return (
                <div
                  key={campaign.id}
                  className={`p-3 rounded-lg border border-[var(--border-color)] ${
                    campaign.archived ? 'opacity-60 bg-gray-800' : 'bg-[var(--card-background)]'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <CampaignModuleSelector
                        topic={editDraft.topic}
                        audience={editDraft.audience}
                        funnel={editDraft.funnel}
                        onChangePart={(part, val) => setEditDraft((prev) => ({ ...prev, [part]: val }))}
                        topics={byType.topic}
                        audiences={byType.audience}
                        funnels={byType.funnel}
                        showLibraryPicker={false}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {user.role === 'admin' && (
                          <select
                            value={editDraft.inhaber}
                            onChange={(e) => setEditDraft((prev) => ({ ...prev, inhaber: e.target.value }))}
                            className="w-52 py-1.5 text-sm"
                          >
                            <option value={user.name}>{user.name} (eigene)</option>
                            <option value="alle">Alle</option>
                          </select>
                        )}
                        <div className="flex gap-2 ml-auto">
                          <button
                            type="button"
                            onClick={() => saveEdit(campaign.id)}
                            className="icon text-[var(--success-color)]"
                            title="Speichern"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="icon text-blue-300"
                            title="Abbrechen"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-mono font-medium text-sm text-white">{campaign.name}</div>
                        <div className="text-xs text-gray-400">
                          Inhaber: {campaign.inhaber || user.name}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyCampaignName(campaign.id, campaign.name)}
                          className={`icon ${copySuccess[campaign.id] ? 'text-[var(--success-color)]' : 'text-blue-300'}`}
                          title="Kopieren"
                        >
                          {copySuccess[campaign.id] ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                        {canModify && (
                          <>
                            <button
                              type="button"
                              onClick={() => startEdit(campaign)}
                              className="icon text-blue-300"
                              title="Bearbeiten"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleArchive(campaign)}
                              className={`icon ${campaign.archived ? 'text-blue-400' : 'text-orange-400'}`}
                              title={campaign.archived ? 'Dearchivieren' : 'Archivieren'}
                            >
                              <Archive size={14} />
                            </button>
                            <button
                              type="button"
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
                  )}
                </div>
              );
            })}

            {filteredCampaigns.length === 0 && (
              <p className="text-center text-gray-400 py-8 mb-0">
                {showArchived ? 'Keine archivierten Kampagnen gefunden' : 'Keine aktiven Kampagnen gefunden'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignLibrary;
