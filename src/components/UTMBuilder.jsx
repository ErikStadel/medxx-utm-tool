import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Copy,
  Check,
  AlertCircle,
  AlertTriangle,
  Plus,
  BookmarkPlus,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import LayoutHeader from './LayoutHeader';
import CampaignModuleSelector from './CampaignModuleSelector';
import ContentModuleSelector from './ContentModuleSelector';
import QuickAddSourceModal from './QuickAddSourceModal';
import QuickAddTopicModal from './QuickAddTopicModal';
import {
  SOURCE_CATEGORY_LABELS,
  normalizeSlug,
  validateFullUtmState,
} from '../utils/utmValidation';

const STANDARD_CATEGORIES = ['digital', 'offline'];

const SOURCE_MODES = [
  { id: 'standard', label: 'Standard-Sources' },
  { id: 'publisher', label: 'Fachportale / Publisher' },
  { id: 'partner', label: 'Service-Partner' },
  { id: 'location', label: 'Standort / NL' },
  { id: 'event', label: 'Messe / Event' },
];

const isSourceAllowedForMedium = (src, chosenMedium) => {
  if (!chosenMedium) return false;
  if (Array.isArray(src.allowed_mediums) && src.allowed_mediums.length > 0) {
    return src.allowed_mediums.includes(chosenMedium);
  }
  return true;
};

const UTMBuilder = ({
  campaigns,
  sources = [],
  components = [],
  onSourceCreated,
  onComponentCreated,
  onLinkSaved,
  user,
  onLogout,
}) => {
  const [baseUrl, setBaseUrl] = useState('https://medatixx.de');
  const [medium, setMedium] = useState('');
  const [sourceMode, setSourceMode] = useState('standard');
  const [source, setSource] = useState('');
  const [isNewPublisher, setIsNewPublisher] = useState(false);
  const [newPublisherSlug, setNewPublisherSlug] = useState('');
  const [newPublisherLabel, setNewPublisherLabel] = useState('');
  const [sourceSearch, setSourceSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [audience, setAudience] = useState('');
  const [funnel, setFunnel] = useState('');
  const [angle, setAngle] = useState('');
  const [format, setFormat] = useState('');
  const [termMode, setTermMode] = useState('none');
  const [termInput, setTermInput] = useState('');
  const [customParams, setCustomParams] = useState('');

  const [note, setNote] = useState('');

  const [copySuccess, setCopySuccess] = useState(false);
  const [copyTemplateSuccess, setCopyTemplateSuccess] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedPublisherSlug, setSavedPublisherSlug] = useState('');
  const [saveError, setSaveError] = useState('');

  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceModalCategory, setSourceModalCategory] = useState('partner');
  const [topicModalOpen, setTopicModalOpen] = useState(false);

  const activeComponents = useMemo(() => {
    const byType = {
      medium: [],
      topic: [],
      audience: [],
      funnel: [],
      angle: [],
      format: [],
    };
    components
      .filter((c) => c.is_active !== false)
      .forEach((item) => {
        if (byType[item.component_type]) {
          byType[item.component_type].push(item);
        }
      });
    return byType;
  }, [components]);

  const activeSources = useMemo(
    () => sources.filter((s) => s.is_active !== false),
    [sources]
  );

  // Erlaubte Mediums für neue Publisher direkt aus den DB-Publishern ableiten
  const publisherAllowedMediums = useMemo(() => {
    const pubSources = activeSources.filter((s) => s.category === 'publisher');
    const set = new Set();
    pubSources.forEach((s) => {
      if (Array.isArray(s.allowed_mediums)) {
        s.allowed_mediums.forEach((m) => set.add(m));
      }
    });
    if (set.size > 0) return Array.from(set);
    return activeComponents.medium.map((m) => m.slug);
  }, [activeSources, activeComponents.medium]);

  const canCreatePublisherForMedium = Boolean(medium && publisherAllowedMediums.includes(medium));

  const matchingSources = useMemo(
    () => (medium ? activeSources.filter((s) => isSourceAllowedForMedium(s, medium)) : []),
    [activeSources, medium]
  );

  const sourceCounts = useMemo(
    () => ({
      standard: matchingSources.filter((s) => STANDARD_CATEGORIES.includes(s.category)).length,
      publisher: matchingSources.filter((s) => s.category === 'publisher').length,
      partner: matchingSources.filter((s) => s.category === 'partner').length,
      location: matchingSources.filter((s) => s.category === 'location').length,
      event: matchingSources.filter((s) => s.category === 'event').length,
    }),
    [matchingSources]
  );

  const standardSources = useMemo(() => {
    const list = matchingSources.filter((s) => STANDARD_CATEGORIES.includes(s.category));
    const byCategory = { digital: [], offline: [] };
    list.forEach((s) => {
      if (byCategory[s.category]) byCategory[s.category].push(s);
    });
    return byCategory;
  }, [matchingSources]);

  const subListSources = useMemo(() => {
    if (sourceMode === 'standard') return [];
    const q = sourceSearch.trim().toLowerCase();
    return matchingSources
      .filter((s) => s.category === sourceMode)
      .filter(
        (s) =>
          !q ||
          s.label.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q)
      )
      .sort((a, b) => a.label.localeCompare(b.label, 'de'));
  }, [matchingSources, sourceMode, sourceSearch]);

  const effectiveSource = isNewPublisher ? newPublisherSlug.trim() : source;

  const duplicatePublisherError = useMemo(() => {
    if (!isNewPublisher || !newPublisherSlug.trim()) return null;
    const exists = activeSources.find((s) => s.slug === newPublisherSlug.trim());
    if (exists) {
      return `Source "${exists.slug}" existiert bereits (${exists.label}). Bitte direkt aus der Liste wählen.`;
    }
    return null;
  }, [isNewPublisher, newPublisherSlug, activeSources]);

  const resolvedTerm = useMemo(() => {
    if (termMode === 'none') return '';
    if (termMode === 'keyword') return '{keyword}';
    const slug = normalizeSlug(termInput);
    if (!slug) return '';
    if (termMode === 'interesse') {
      return slug.startsWith('interesse-') ? slug : `interesse-${slug}`;
    }
    if (termMode === 'jobtitel') {
      return slug.startsWith('jobtitel-') ? slug : `jobtitel-${slug}`;
    }
    return slug;
  }, [termMode, termInput]);

  const validation = useMemo(() => {
    const allowedMediums = activeComponents.medium.map((m) => m.slug);
    const allowedFunnels = activeComponents.funnel.map((f) => f.slug);

    const result = validateFullUtmState(
      {
        baseUrl,
        source: effectiveSource,
        medium,
        topic,
        audience,
        funnel,
        angle,
        format,
        term: resolvedTerm,
        customParams,
      },
      {
        sources: activeSources,
        allowedMediums,
        allowedFunnels,
        isNewPublisher,
      }
    );

    if (duplicatePublisherError) {
      result.errors.source = duplicatePublisherError;
      result.isValid = false;
    }

    return result;
  }, [
    baseUrl,
    effectiveSource,
    medium,
    topic,
    audience,
    funnel,
    angle,
    format,
    resolvedTerm,
    customParams,
    activeSources,
    activeComponents,
    isNewPublisher,
    duplicatePublisherError,
  ]);

  const utmCampaign = topic && audience && funnel ? `${topic}_${audience}_${funnel}` : '';
  const utmContent = angle && format ? `${angle}_${format}` : '';

  const trackingTemplate = useMemo(() => {
    if (!effectiveSource || !medium || !utmCampaign) return '';
    const parts = [
      `utm_source=${effectiveSource}`,
      `utm_medium=${medium}`,
      `utm_campaign=${utmCampaign}`,
    ];
    if (utmContent) parts.push(`utm_content=${utmContent}`);
    if (resolvedTerm) parts.push(`utm_term=${resolvedTerm}`);
    if (customParams.trim()) {
      customParams
        .split('&')
        .map((p) => p.trim())
        .filter(Boolean)
        .forEach((p) => parts.push(p));
    }
    return parts.join('&');
  }, [effectiveSource, medium, utmCampaign, utmContent, resolvedTerm, customParams]);

  const fullUrl = useMemo(() => {
    if (!baseUrl.trim() || !trackingTemplate) return '';
    let cleanBase = baseUrl.trim();
    if (!/^https?:\/\//i.test(cleanBase)) {
      cleanBase = `https://${cleanBase}`;
    }
    const separator = cleanBase.includes('?') ? '&' : '?';
    return `${cleanBase}${separator}${trackingTemplate}`;
  }, [baseUrl, trackingTemplate]);

  const handleMediumChange = (nextMedium) => {
    setMedium(nextMedium);
    setSourceSearch('');
    setSaveSuccess(false);
    setSavedPublisherSlug('');

    if (!nextMedium) {
      setSource('');
      setIsNewPublisher(false);
      setNewPublisherSlug('');
      setNewPublisherLabel('');
      return;
    }

    const nextMatching = activeSources.filter((s) => isSourceAllowedForMedium(s, nextMedium));
    const currentStillAllowed =
      !isNewPublisher && source && nextMatching.some((s) => s.slug === source);

    if (!currentStillAllowed) {
      setSource('');
    }

    const nextPubAllowed = publisherAllowedMediums.includes(nextMedium);
    if (isNewPublisher && !nextPubAllowed) {
      setIsNewPublisher(false);
      setNewPublisherSlug('');
      setNewPublisherLabel('');
    }

    // Automatisch in einen passenden Source-Modus wechseln, falls der aktuelle Modus leer ist
    const counts = {
      standard: nextMatching.filter((s) => STANDARD_CATEGORIES.includes(s.category)).length,
      publisher: nextMatching.filter((s) => s.category === 'publisher').length,
      partner: nextMatching.filter((s) => s.category === 'partner').length,
      location: nextMatching.filter((s) => s.category === 'location').length,
      event: nextMatching.filter((s) => s.category === 'event').length,
    };

    const currentModeHasOptions =
      sourceMode === 'publisher'
        ? counts.publisher > 0 || nextPubAllowed
        : counts[sourceMode] > 0;

    if (!currentModeHasOptions) {
      const firstAvailable = ['standard', 'publisher', 'partner', 'location', 'event'].find(
        (m) => (m === 'publisher' ? counts.publisher > 0 || nextPubAllowed : counts[m] > 0)
      );
      if (firstAvailable) {
        setSourceMode(firstAvailable);
      }
    }
  };

  const switchSourceMode = (nextMode) => {
    setSourceMode(nextMode);
    setSourceSearch('');
    setIsNewPublisher(false);
    setNewPublisherSlug('');
    setNewPublisherLabel('');

    const currentObj = activeSources.find((s) => s.slug === source);
    const keepCurrent =
      nextMode === 'standard'
        ? currentObj && STANDARD_CATEGORIES.includes(currentObj.category)
        : currentObj && currentObj.category === nextMode;

    if (!keepCurrent) {
      setSource('');
    }
    setSaveSuccess(false);
    setSavedPublisherSlug('');
  };

  const handleReset = () => {
    setMedium('');
    setSourceMode('standard');
    setSource('');
    setIsNewPublisher(false);
    setNewPublisherSlug('');
    setNewPublisherLabel('');
    setSourceSearch('');
    setTopic('');
    setAudience('');
    setFunnel('');
    setAngle('');
    setFormat('');
    setTermMode('none');
    setTermInput('');
    setCustomParams('');
    setNote('');
    setSaveSuccess(false);
    setSavedPublisherSlug('');
    setSaveError('');
  };

  const handleSourceChange = (nextValue) => {
    if (nextValue.startsWith('__mode:')) {
      const targetMode = nextValue.replace('__mode:', '');
      switchSourceMode(targetMode);
      return;
    }

    if (nextValue === '__new_publisher') {
      setIsNewPublisher(true);
      setSource('');
      setNewPublisherSlug('');
      setNewPublisherLabel('');
      setSaveSuccess(false);
      setSavedPublisherSlug('');
      return;
    }

    setIsNewPublisher(false);
    setNewPublisherSlug('');
    setNewPublisherLabel('');
    setSource(nextValue);
    setSaveSuccess(false);
    setSavedPublisherSlug('');
  };

  const handleSelectCampaignFromLibrary = (campaignName) => {
    const parts = campaignName.split('_');
    if (parts.length === 3) {
      setTopic(parts[0]);
      setAudience(parts[1]);
      setFunnel(parts[2]);
    }
    setSaveSuccess(false);
  };

  const handleCopyUrl = async () => {
    if (!fullUrl) return;
    await navigator.clipboard.writeText(fullUrl);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCopyTemplate = async () => {
    if (!trackingTemplate) return;
    await navigator.clipboard.writeText(trackingTemplate);
    setCopyTemplateSuccess(true);
    setTimeout(() => setCopyTemplateSuccess(false), 2000);
  };

  const handleSaveLink = async () => {
    if (!validation.isValid || !fullUrl) return;
    try {
      setIsSavingLink(true);
      setSaveError('');
      setSaveSuccess(false);
      setSavedPublisherSlug('');

      const res = await fetch('/api/links', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: baseUrl.trim(),
          full_url: fullUrl,
          tracking_template: trackingTemplate,
          utm_source: effectiveSource,
          utm_medium: medium,
          utm_campaign: utmCampaign,
          utm_content: utmContent || null,
          utm_term: resolvedTerm || null,
          custom_params: customParams.trim() || null,
          note: note.trim() || null,
          new_publisher: isNewPublisher
            ? {
                slug: newPublisherSlug.trim(),
                label: newPublisherLabel.trim() || newPublisherSlug.trim(),
              }
            : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Link konnte nicht gespeichert werden');
      }

      const savedLink = data.link || data;
      const createdSource = data.createdSource || null;

      if (createdSource) {
        if (onSourceCreated) onSourceCreated(createdSource);
        setIsNewPublisher(false);
        setSource(createdSource.slug);
        setNewPublisherSlug('');
        setNewPublisherLabel('');
        setSavedPublisherSlug(createdSource.slug);
      }

      if (onLinkSaved) onLinkSaved(savedLink);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSavingLink(false);
    }
  };

  const normalizedSuggestion = isNewPublisher ? normalizeSlug(newPublisherSlug) : '';
  const canGenerate = validation.isValid && Boolean(fullUrl);

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <LayoutHeader title="medatixx UTM Builder" user={user} onLogout={onLogout} />

      <div className="container content-container">
        <div className="card space-y-8">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-color)] pb-5">
            <div>
              <h2 className="mb-1">Modularer UTM-Parameter Generator</h2>
              <p className="text-sm text-[var(--text-muted)] mb-0">
                Alle Bausteine stammen aus Neon und werden per Dropdown nach einheitlichem Standard zusammengestellt und geprüft.
              </p>
            </div>
            <button type="button" onClick={handleReset} className="secondary flex items-center gap-1.5 text-sm">
              <RotateCcw size={15} /> Zurücksetzen
            </button>
          </div>

          {/* Base URL */}
          <div className="section-panel">
            <div>
              <label className="mb-1 text-base font-semibold">Ziel-URL (Base URL) *</label>
              <p className="text-xs text-[var(--text-muted)] mb-3">
                Zielseite auf medatixx.de oder externer Landingpage, an die die UTM-Parameter angehängt werden.
              </p>
              <input
                type="url"
                value={baseUrl}
                onChange={(e) => {
                  setBaseUrl(e.target.value);
                  setSaveSuccess(false);
                }}
                placeholder="https://medatixx.de/..."
                className={validation.errors.baseUrl ? 'error' : ''}
              />
              {validation.errors.baseUrl && (
                <div className="validation-message error-message">
                  <AlertCircle size={15} className="mr-2 shrink-0" />
                  {validation.errors.baseUrl}
                </div>
              )}
            </div>
          </div>

          {/* 1. Fundament: ZUERST utm_medium, DANACH erlaubte utm_source */}
          <div className="section-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-base font-semibold">
                1. Fundament (Medium & Source) *
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSourceModalCategory('partner');
                    setSourceModalOpen(true);
                  }}
                  className="secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <Plus size={14} /> Partner anlegen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceModalCategory('event');
                    setSourceModalOpen(true);
                  }}
                  className="secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <Plus size={14} /> Messe anlegen
                </button>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceModalCategory('digital');
                      setSourceModalOpen(true);
                    }}
                    className="secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                  >
                    <Plus size={14} /> Source (Admin)
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Schritt 1: UTM Medium */}
              <div>
                <label className="field-label">1. UTM Medium (Kanal) *</label>
                <select
                  aria-label="UTM Medium"
                  value={medium}
                  onChange={(e) => handleMediumChange(e.target.value)}
                  className={validation.errors.medium ? 'error' : ''}
                >
                  <option value="">-- Medium wählen --</option>
                  {activeComponents.medium.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.slug} {m.description ? `— ${m.description}` : ''}
                    </option>
                  ))}
                </select>
                {validation.errors.medium && (
                  <div className="validation-message error-message">
                    <AlertCircle size={15} className="mr-2 shrink-0" />
                    {validation.errors.medium}
                  </div>
                )}
              </div>

              {/* Schritt 2: UTM Source (gefiltert nach erlaubten Sources für das gewählte Medium) */}
              <div className="space-y-3">
                <label className="field-label mb-1">2. UTM Source (Passende Absender) *</label>

                <div className="flex flex-wrap gap-1.5">
                  {SOURCE_MODES.map((m) => {
                    const count = sourceCounts[m.id] || 0;
                    const modeAvailable =
                      medium && (m.id === 'publisher' ? count > 0 || canCreatePublisherForMedium : count > 0);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        disabled={!medium || !modeAvailable}
                        onClick={() => switchSourceMode(m.id)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          sourceMode === m.id && medium
                            ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-sm'
                            : 'bg-[var(--secondary-btn-bg)] border-[var(--border-strong)] text-[var(--text-color)] hover:bg-[var(--secondary-btn-hover)]'
                        }`}
                      >
                        {m.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {!medium ? (
                  <select aria-label="UTM Source" disabled value="">
                    <option value="">-- Zuerst UTM Medium wählen --</option>
                  </select>
                ) : sourceMode === 'standard' ? (
                  <select
                    aria-label="UTM Source"
                    value={source}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className={validation.errors.source ? 'error' : ''}
                  >
                    <option value="">-- Source wählen --</option>
                    {Object.entries(standardSources).map(([cat, list]) =>
                      list.length > 0 ? (
                        <optgroup key={cat} label={SOURCE_CATEGORY_LABELS[cat] || cat}>
                          {list.map((s) => (
                            <option key={s.slug} value={s.slug}>
                              {s.slug} — {s.label}
                            </option>
                          ))}
                        </optgroup>
                      ) : null
                    )}
                    {(sourceCounts.publisher > 0 ||
                      canCreatePublisherForMedium ||
                      sourceCounts.partner > 0 ||
                      sourceCounts.location > 0 ||
                      sourceCounts.event > 0) && (
                      <optgroup label="Weitere Listen öffnen">
                        {(sourceCounts.publisher > 0 || canCreatePublisherForMedium) && (
                          <option value="__mode:publisher">
                            Fachportal / Publisher auswählen ({sourceCounts.publisher})...
                          </option>
                        )}
                        {sourceCounts.partner > 0 && (
                          <option value="__mode:partner">
                            Partner auswählen ({sourceCounts.partner} Service-Partner)...
                          </option>
                        )}
                        {sourceCounts.location > 0 && (
                          <option value="__mode:location">
                            Standort / Niederlassung auswählen ({sourceCounts.location})...
                          </option>
                        )}
                        {sourceCounts.event > 0 && (
                          <option value="__mode:event">
                            Messe / Event auswählen ({sourceCounts.event})...
                          </option>
                        )}
                      </optgroup>
                    )}
                  </select>
                ) : (
                  <div className="subpanel">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[var(--primary-color)]">
                        {SOURCE_CATEGORY_LABELS[sourceMode]} ({subListSources.length})
                      </span>
                      <input
                        type="text"
                        value={sourceSearch}
                        onChange={(e) => setSourceSearch(e.target.value)}
                        placeholder={
                          sourceMode === 'partner'
                            ? 'Partner suchen (z. B. Bauer, al-data)...'
                            : sourceMode === 'publisher'
                              ? 'Publisher suchen...'
                              : 'Liste filtern...'
                        }
                        className="w-52 py-1.5 px-3 text-xs"
                      />
                    </div>

                    <select
                      aria-label={SOURCE_CATEGORY_LABELS[sourceMode]}
                      value={isNewPublisher ? '__new_publisher' : source}
                      onChange={(e) => handleSourceChange(e.target.value)}
                      className={validation.errors.source ? 'error' : ''}
                    >
                      <option value="">
                        -- {SOURCE_CATEGORY_LABELS[sourceMode]} wählen --
                      </option>
                      {sourceMode === 'publisher' && canCreatePublisherForMedium && (
                        <option value="__new_publisher">+ Neuer Publisher (Freitext)</option>
                      )}
                      {subListSources.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.label} ({s.slug})
                        </option>
                      ))}
                    </select>

                    {isNewPublisher && (
                      <div className="pt-3 border-t border-[var(--border-color)] space-y-3">
                        <div>
                          <label className="text-xs text-[var(--text-muted)]">
                            Neuer Publisher-Slug (Naming Convention: klein, keine Umlaute/Leerzeichen) *
                          </label>
                          <input
                            type="text"
                            value={newPublisherSlug}
                            onChange={(e) => {
                              setNewPublisherSlug(e.target.value);
                              setSaveSuccess(false);
                            }}
                            placeholder="z. B. aerzte-zeitung oder springer-medizin"
                            className={`font-mono text-sm ${validation.errors.source ? 'error' : ''}`}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-[var(--text-muted)]">
                            Anzeigename im Dropdown (optional)
                          </label>
                          <input
                            type="text"
                            value={newPublisherLabel}
                            onChange={(e) => {
                              setNewPublisherLabel(e.target.value);
                              setSaveSuccess(false);
                            }}
                            placeholder="z. B. Ärzte Zeitung"
                            className="text-sm"
                          />
                        </div>
                        <p className="text-xs text-[var(--info-color)] mb-0">
                          Wird beim Klick auf „Link speichern“ automatisch in Neon eingetragen.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {effectiveSource && !validation.errors.source && (
                  <p className="text-xs text-[var(--success-color)] mb-0 flex items-center gap-1.5">
                    Gewählte Tracking-ID: <code className="code-chip">{effectiveSource}</code>
                  </p>
                )}

                {validation.errors.source && (
                  <div className="validation-message error-message flex-wrap justify-between gap-2">
                    <span className="flex items-center">
                      <AlertCircle size={15} className="mr-2 shrink-0" />
                      {validation.errors.source}
                    </span>
                    {isNewPublisher &&
                      normalizedSuggestion &&
                      normalizedSuggestion !== newPublisherSlug &&
                      !duplicatePublisherError && (
                        <button
                          type="button"
                          onClick={() => setNewPublisherSlug(normalizedSuggestion)}
                          className="secondary text-xs underline font-mono px-2.5 py-1"
                        >
                          Übernehmen: {normalizedSuggestion}
                        </button>
                      )}
                  </div>
                )}
              </div>
            </div>

            {validation.warnings.sourceMedium && (
              <div className="validation-message warning-message">
                <AlertTriangle size={15} className="mr-2 shrink-0" />
                {validation.warnings.sourceMedium}
              </div>
            )}
          </div>

          {/* 2. Modulare utm_campaign */}
          <CampaignModuleSelector
            topic={topic}
            audience={audience}
            funnel={funnel}
            onChangePart={(part, val) => {
              if (part === 'topic') setTopic(val);
              else if (part === 'audience') setAudience(val);
              else if (part === 'funnel') setFunnel(val);
              setSaveSuccess(false);
            }}
            topics={activeComponents.topic}
            audiences={activeComponents.audience}
            funnels={activeComponents.funnel}
            campaigns={campaigns}
            onSelectFromLibrary={handleSelectCampaignFromLibrary}
            canAddTopic={user?.role === 'admin'}
            onOpenAddTopic={() => setTopicModalOpen(true)}
          />

          {/* 3. Modulare utm_content */}
          <ContentModuleSelector
            angle={angle}
            format={format}
            onChangePart={(part, val) => {
              if (part === 'angle') setAngle(val);
              else if (part === 'format') setFormat(val);
              setSaveSuccess(false);
            }}
            angles={activeComponents.angle}
            formats={activeComponents.format}
          />

          {/* 4. Detail-Parameter utm_term & Benutzerdefiniert */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="section-panel">
              <label className="mb-0 text-base font-semibold">
                4. UTM Term <span className="text-xs font-normal text-[var(--text-muted)]">(optional – Micro-Targeting)</span>
              </label>
              <select
                value={termMode}
                onChange={(e) => {
                  setTermMode(e.target.value);
                  setTermInput('');
                  setSaveSuccess(false);
                }}
              >
                <option value="none">-- Kein utm_term --</option>
                <option value="keyword">Google Ads dynamisch ({'{keyword}'})</option>
                <option value="jobtitel">Jobtitel (jobtitel-...)</option>
                <option value="interesse">Interesse (interesse-...)</option>
                <option value="custom">Eigener Slug</option>
              </select>

              {(termMode === 'jobtitel' || termMode === 'interesse' || termMode === 'custom') && (
                <div>
                  <input
                    type="text"
                    value={termInput}
                    onChange={(e) => {
                      setTermInput(e.target.value);
                      setSaveSuccess(false);
                    }}
                    placeholder={
                      termMode === 'jobtitel'
                        ? 'z. B. niedergelassen oder praxismanagement'
                        : termMode === 'interesse'
                          ? 'z. B. ehealth'
                          : 'z. B. praxissoftware-vergleich'
                    }
                  />
                  {resolvedTerm && (
                    <p className="text-xs text-[var(--text-muted)] mt-2 mb-0 flex items-center gap-1.5">
                      Normalisiert: <code className="code-chip">{resolvedTerm}</code>
                    </p>
                  )}
                </div>
              )}

              {validation.errors.term && (
                <div className="validation-message error-message">
                  <AlertCircle size={15} className="mr-2 shrink-0" />
                  {validation.errors.term}
                </div>
              )}
              {validation.warnings.term && (
                <div className="validation-message warning-message">
                  <AlertTriangle size={15} className="mr-2 shrink-0" />
                  {validation.warnings.term}
                </div>
              )}
            </div>

            <div className="section-panel">
              <label className="mb-0 text-base font-semibold">
                Benutzerdefinierte Parameter <span className="text-xs font-normal text-[var(--text-muted)]">(optional)</span>
              </label>
              <input
                type="text"
                value={customParams}
                onChange={(e) => {
                  setCustomParams(e.target.value);
                  setSaveSuccess(false);
                }}
                placeholder="param1=wert1&param2=wert2"
                className={validation.errors.customParams ? 'error' : ''}
              />
              {validation.errors.customParams && (
                <div className="validation-message error-message">
                  <AlertCircle size={15} className="mr-2 shrink-0" />
                  {validation.errors.customParams}
                </div>
              )}
              <p className="text-xs text-[var(--text-muted)] mb-0">
                Nur für technische Zusatzparameter verwenden, nicht für Standard-UTM-Dimensionen.
              </p>
            </div>
          </div>

          {/* Offline Hinweis */}
          {validation.warnings.offline && (
            <div className="validation-message info-message">
              <AlertTriangle size={15} className="mr-2 shrink-0" />
              {validation.warnings.offline}
            </div>
          )}

          {/* Generierte URL + Link speichern */}
          {canGenerate ? (
            <div className="generated-url-container space-y-6">
              <div>
                <h3 className="text-base font-semibold mb-2">Generierte URL (Check bestanden)</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className={copySuccess ? 'success py-3 px-4' : 'primary py-3 px-4'}
                    title="URL kopieren"
                  >
                    {copySuccess ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                {copySuccess && (
                  <p className="text-[var(--success-color)] text-sm mt-2 mb-0">
                    ✓ URL in Zwischenablage kopiert!
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-base font-semibold mb-2">Tracking-Vorlage (nur Parameter)</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={trackingTemplate}
                    readOnly
                    className="flex-1 text-sm font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className={copyTemplateSuccess ? 'success py-3 px-4' : 'secondary py-3 px-4'}
                    title="Parameter kopieren"
                  >
                    {copyTemplateSuccess ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
                {copyTemplateSuccess && (
                  <p className="text-[var(--success-color)] text-sm mt-2 mb-0">
                    ✓ Tracking-Vorlage in Zwischenablage kopiert!
                  </p>
                )}
              </div>

              {/* Link speichern Box */}
              <div className="pt-5 border-t border-[var(--border-color)] space-y-4">
                <h3 className="mb-0 text-base font-semibold">Link in Neon speichern</h3>
                <div>
                  <label className="field-label">Notiz / Einsatzort (optional)</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => {
                      setNote(e.target.value);
                      setSaveSuccess(false);
                    }}
                    placeholder="z. B. Q4 Partner-Rollup Nord oder LinkedIn Carousel"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={handleSaveLink}
                    disabled={isSavingLink}
                    className="primary flex items-center gap-2 px-5 py-2.5"
                  >
                    <BookmarkPlus size={17} />
                    {isSavingLink ? 'Speichert...' : 'Link speichern'}
                  </button>

                  {saveSuccess && (
                    <span className="text-sm text-[var(--success-color)] flex flex-wrap items-center gap-2">
                      ✓ Link gespeichert!
                      {savedPublisherSlug && (
                        <span>
                          Neuer Publisher <code className="code-chip">{savedPublisherSlug}</code> wurde in Neon eingetragen.
                        </span>
                      )}
                      <Link to="/links" className="underline inline-flex items-center gap-1 text-[var(--primary-color)]">
                        Alle gespeicherten Links <ExternalLink size={13} />
                      </Link>
                    </span>
                  )}
                </div>

                {saveError && (
                  <div className="validation-message error-message">
                    <AlertCircle size={15} className="mr-2 shrink-0" />
                    {saveError}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-xl bg-[var(--section-background)] border border-dashed border-[var(--border-strong)] text-sm text-[var(--text-muted)]">
              Bitte Base URL, UTM Medium, erlaubte UTM Source sowie alle 3 Bausteine von UTM Campaign (Thema, Zielgruppe, Funnel) gültig auswählen, um die URL zu generieren und zu speichern.
            </div>
          )}
        </div>
      </div>

      <QuickAddSourceModal
        isOpen={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        user={user}
        mediumOptions={activeComponents.medium}
        initialCategory={sourceModalCategory}
        onCreated={(newSource) => {
          if (onSourceCreated) onSourceCreated(newSource);
          setIsNewPublisher(false);
          setNewPublisherSlug('');
          setNewPublisherLabel('');
          if (newSource.default_medium) {
            setMedium(newSource.default_medium);
          } else if (Array.isArray(newSource.allowed_mediums) && newSource.allowed_mediums.length > 0) {
            setMedium(newSource.allowed_mediums[0]);
          }
          if (['publisher', 'partner', 'location', 'event'].includes(newSource.category)) {
            setSourceMode(newSource.category);
          } else {
            setSourceMode('standard');
          }
          setSource(newSource.slug);
        }}
      />

      <QuickAddTopicModal
        isOpen={topicModalOpen}
        onClose={() => setTopicModalOpen(false)}
        user={user}
        onCreated={(newTopic) => {
          if (onComponentCreated) onComponentCreated(newTopic);
          setTopic(newTopic.slug);
          setSaveSuccess(false);
        }}
      />
    </div>
  );
};

export default UTMBuilder;
