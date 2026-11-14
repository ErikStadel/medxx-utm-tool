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
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import LayoutHeader from './LayoutHeader';
import CampaignModuleSelector from './CampaignModuleSelector';
import ContentModuleSelector from './ContentModuleSelector';
import QuickAddSourceModal from './QuickAddSourceModal';
import {
  ALLOWED_FUNNELS,
  ALLOWED_MEDIUMS,
  SCENARIO_PRESETS,
  SOURCE_CATEGORY_LABELS,
  getLookerStudioPreview,
  normalizeSlug,
  validateFullUtmState,
} from '../utils/utmValidation';

const STANDARD_CATEGORIES = ['digital', 'publisher', 'offline'];

const SOURCE_MODES = [
  { id: 'standard', label: 'Standard-Sources' },
  { id: 'partner', label: 'Service-Partner' },
  { id: 'location', label: 'Standort / NL' },
  { id: 'event', label: 'Messe / Event' },
];

const UTMBuilder = ({
  campaigns,
  sources = [],
  components = [],
  onSourceCreated,
  onLinkSaved,
  user,
  onLogout,
}) => {
  const [baseUrl, setBaseUrl] = useState('https://medatixx.de');
  const [medium, setMedium] = useState('');
  const [sourceMode, setSourceMode] = useState('standard');
  const [source, setSource] = useState('');
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
  const [shortlinkUrl, setShortlinkUrl] = useState('');

  const [copySuccess, setCopySuccess] = useState(false);
  const [copyTemplateSuccess, setCopyTemplateSuccess] = useState(false);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceModalCategory, setSourceModalCategory] = useState('partner');

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

  const sourceCounts = useMemo(
    () => ({
      standard: activeSources.filter((s) => STANDARD_CATEGORIES.includes(s.category)).length,
      partner: activeSources.filter((s) => s.category === 'partner').length,
      location: activeSources.filter((s) => s.category === 'location').length,
      event: activeSources.filter((s) => s.category === 'event').length,
    }),
    [activeSources]
  );

  const standardSources = useMemo(() => {
    const list = activeSources.filter((s) => STANDARD_CATEGORIES.includes(s.category));
    const recommended = [];
    const byCategory = { digital: [], publisher: [], offline: [] };

    list.forEach((s) => {
      const isCompatible =
        medium &&
        ((Array.isArray(s.allowed_mediums) && s.allowed_mediums.includes(medium)) ||
          s.default_medium === medium);
      if (isCompatible) recommended.push(s);
      if (byCategory[s.category]) byCategory[s.category].push(s);
    });

    return { recommended, byCategory };
  }, [activeSources, medium]);

  const subListSources = useMemo(() => {
    if (sourceMode === 'standard') return [];
    const q = sourceSearch.trim().toLowerCase();
    return activeSources
      .filter((s) => s.category === sourceMode)
      .filter(
        (s) =>
          !q ||
          s.label.toLowerCase().includes(q) ||
          s.slug.toLowerCase().includes(q)
      )
      .sort((a, b) => a.label.localeCompare(b.label, 'de'));
  }, [activeSources, sourceMode, sourceSearch]);

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
    const allowedMediums =
      activeComponents.medium.length > 0
        ? activeComponents.medium.map((m) => m.slug)
        : ALLOWED_MEDIUMS;
    const allowedFunnels =
      activeComponents.funnel.length > 0
        ? activeComponents.funnel.map((f) => f.slug)
        : ALLOWED_FUNNELS;

    return validateFullUtmState(
      {
        baseUrl,
        source,
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
      }
    );
  }, [
    baseUrl,
    source,
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
  ]);

  const utmCampaign = topic && audience && funnel ? `${topic}_${audience}_${funnel}` : '';
  const utmContent = angle && format ? `${angle}_${format}` : '';

  const trackingTemplate = useMemo(() => {
    if (!source || !medium || !utmCampaign) return '';
    const parts = [
      `utm_source=${source}`,
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
  }, [source, medium, utmCampaign, utmContent, resolvedTerm, customParams]);

  const fullUrl = useMemo(() => {
    if (!baseUrl.trim() || !trackingTemplate) return '';
    let cleanBase = baseUrl.trim();
    if (!/^https?:\/\//i.test(cleanBase)) {
      cleanBase = `https://${cleanBase}`;
    }
    const separator = cleanBase.includes('?') ? '&' : '?';
    return `${cleanBase}${separator}${trackingTemplate}`;
  }, [baseUrl, trackingTemplate]);

  const lookerPreview = useMemo(
    () =>
      getLookerStudioPreview({
        source,
        medium,
        topic,
        audience,
        funnel,
        angle,
        format,
        term: resolvedTerm,
      }),
    [source, medium, topic, audience, funnel, angle, format, resolvedTerm]
  );

  const switchSourceMode = (nextMode) => {
    setSourceMode(nextMode);
    setSourceSearch('');
    const currentObj = activeSources.find((s) => s.slug === source);
    if (nextMode === 'standard') {
      if (currentObj && !STANDARD_CATEGORIES.includes(currentObj.category)) {
        setSource('');
      }
    } else if (!currentObj || currentObj.category !== nextMode) {
      setSource('');
    }
    setSaveSuccess(false);
  };

  const handleApplyPreset = (preset) => {
    if (preset.medium) setMedium(preset.medium);
    if (preset.sourceMode) {
      setSourceMode(preset.sourceMode);
      setSourceSearch('');
    }
    if (preset.source) setSource(preset.source);
    else setSource('');
    if (preset.topic) setTopic(preset.topic);
    if (preset.audience) setAudience(preset.audience);
    if (preset.funnel) setFunnel(preset.funnel);
    if (preset.angle) setAngle(preset.angle);
    if (preset.format) setFormat(preset.format);
    if (preset.termMode) {
      setTermMode(preset.termMode);
      setTermInput('');
    }
    setSaveSuccess(false);
    setSaveError('');
  };

  const handleReset = () => {
    setMedium('');
    setSourceMode('standard');
    setSource('');
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
    setShortlinkUrl('');
    setSaveSuccess(false);
    setSaveError('');
  };

  const handleSourceChange = (nextValue) => {
    if (nextValue.startsWith('__mode:')) {
      const targetMode = nextValue.replace('__mode:', '');
      switchSourceMode(targetMode);
      return;
    }

    setSource(nextValue);
    const found = activeSources.find((s) => s.slug === nextValue);
    if (found) {
      if (!medium && found.default_medium) {
        setMedium(found.default_medium);
      }
      if (found.shortlink_path && !shortlinkUrl) {
        setShortlinkUrl(found.shortlink_path);
      }
    }
    setSaveSuccess(false);
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
      const res = await fetch('/api/links', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: baseUrl.trim(),
          full_url: fullUrl,
          tracking_template: trackingTemplate,
          utm_source: source,
          utm_medium: medium,
          utm_campaign: utmCampaign,
          utm_content: utmContent || null,
          utm_term: resolvedTerm || null,
          custom_params: customParams.trim() || null,
          shortlink_url: shortlinkUrl.trim() || null,
          note: note.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Link konnte nicht gespeichert werden');
      }
      if (onLinkSaved) onLinkSaved(data);
      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setIsSavingLink(false);
    }
  };

  const canGenerate = validation.isValid && Boolean(fullUrl);

  return (
    <div className="min-h-screen bg-[var(--background-color)]">
      <LayoutHeader title="medatixx UTM Builder" user={user} onLogout={onLogout} />

      <div className="container content-container">
        <div className="card space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="mb-1">Modularer UTM-Parameter Generator</h2>
              <p className="text-sm text-gray-300 mb-0">
                Alle Bausteine werden per Dropdown nach GA4- & Looker-Studio-Standard zusammengestellt und live geprüft.
              </p>
            </div>
            <button type="button" onClick={handleReset} className="secondary flex items-center gap-1.5 text-sm">
              <RotateCcw size={15} /> Zurücksetzen
            </button>
          </div>

          {/* Schnellvorlagen / Szenarien */}
          <div className="p-4 rounded-lg bg-gray-800/40 border border-[var(--border-color)]">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-300 mb-2">
              <Sparkles size={14} className="text-[var(--primary-color)]" />
              Szenario-Vorlagen (optional)
            </div>
            <div className="flex flex-wrap gap-2">
              {SCENARIO_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  title={preset.description}
                  className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-[var(--border-color)] text-[var(--text-color)]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Base URL */}
          <div>
            <label>Ziel-URL (Base URL) *</label>
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

          {/* 1. Fundament: utm_medium & utm_source (2-stufig) */}
          <div className="p-4 rounded-lg bg-gray-800/60 border border-[var(--border-color)] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-base font-semibold">
                1. Fundament (GA4 Channel-Clustering) *
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSourceModalCategory('partner');
                    setSourceModalOpen(true);
                  }}
                  className="secondary text-xs flex items-center gap-1 py-1.5 px-2.5"
                >
                  <Plus size={14} /> Partner anlegen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceModalCategory('event');
                    setSourceModalOpen(true);
                  }}
                  className="secondary text-xs flex items-center gap-1 py-1.5 px-2.5"
                >
                  <Plus size={14} /> Messe anlegen
                </button>
                {user.role === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceModalCategory('publisher');
                      setSourceModalOpen(true);
                    }}
                    className="secondary text-xs flex items-center gap-1 py-1.5 px-2.5"
                  >
                    <Plus size={14} /> Source (Admin)
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div>
                <label>UTM Medium (GA4-Kanal) *</label>
                <select
                  value={medium}
                  onChange={(e) => {
                    setMedium(e.target.value);
                    setSaveSuccess(false);
                  }}
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

              <div className="space-y-2">
                <label className="mb-1">UTM Source (Typ & Absender) *</label>

                {/* Quell-Typ Auswahl */}
                <div className="flex flex-wrap gap-1.5">
                  {SOURCE_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => switchSourceMode(m.id)}
                      className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                        sourceMode === m.id
                          ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white'
                          : 'bg-gray-900/60 border-[var(--border-color)] text-gray-300 hover:bg-gray-700'
                      }`}
                    >
                      {m.label} ({sourceCounts[m.id] || 0})
                    </button>
                  ))}
                </div>

                {sourceMode === 'standard' ? (
                  <select
                    value={source}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className={validation.errors.source ? 'error' : ''}
                  >
                    <option value="">-- Source wählen --</option>
                    {standardSources.recommended.length > 0 && (
                      <optgroup label={`Passend zu "${medium}"`}>
                        {standardSources.recommended.map((s) => (
                          <option key={`rec-${s.slug}`} value={s.slug}>
                            {s.slug} — {s.label}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {Object.entries(standardSources.byCategory).map(([cat, list]) =>
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
                    <optgroup label="Große Listen gezielt öffnen">
                      <option value="__mode:partner">
                        Partner auswählen ({sourceCounts.partner} Service-Partner)...
                      </option>
                      <option value="__mode:location">
                        Standort / Niederlassung auswählen ({sourceCounts.location})...
                      </option>
                      <option value="__mode:event">
                        Messe / Event auswählen ({sourceCounts.event})...
                      </option>
                    </optgroup>
                  </select>
                ) : (
                  <div className="p-3 rounded-lg bg-gray-900/60 border border-[var(--border-color)] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-blue-300">
                        {SOURCE_CATEGORY_LABELS[sourceMode]} ({subListSources.length})
                      </span>
                      <input
                        type="text"
                        value={sourceSearch}
                        onChange={(e) => setSourceSearch(e.target.value)}
                        placeholder={
                          sourceMode === 'partner'
                            ? 'Partner suchen (z. B. Bauer, al-data)...'
                            : 'Liste filtern...'
                        }
                        className="w-48 py-1 px-2 text-xs"
                      />
                    </div>
                    <select
                      value={source}
                      onChange={(e) => handleSourceChange(e.target.value)}
                      className={validation.errors.source ? 'error' : ''}
                    >
                      <option value="">
                        -- {SOURCE_CATEGORY_LABELS[sourceMode]} wählen --
                      </option>
                      {subListSources.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.label} ({s.slug})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {source && !validation.errors.source && (
                  <p className="text-xs text-[var(--success-color)] mb-0">
                    Gewählte Tracking-ID: <code className="font-mono">{source}</code>
                  </p>
                )}

                {validation.errors.source && (
                  <div className="validation-message error-message">
                    <AlertCircle size={15} className="mr-2 shrink-0" />
                    {validation.errors.source}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-gray-800/60 border border-[var(--border-color)] space-y-3">
              <label className="mb-0 font-semibold">UTM Term (optional – Micro-Targeting / Search)</label>
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
                    <p className="text-xs text-gray-300 mt-1 mb-0">
                      Normalisiert: <code className="text-green-300">{resolvedTerm}</code>
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

            <div className="p-4 rounded-lg bg-gray-800/60 border border-[var(--border-color)] space-y-3">
              <label className="mb-0 font-semibold">Benutzerdefinierte Parameter (optional)</label>
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
              <p className="text-xs text-gray-400 mb-0">
                Nur für technische Zusatzparameter verwenden, nicht für Standard-UTM-Dimensionen.
              </p>
            </div>
          </div>

          {/* Offline Shortlink Hinweis */}
          {validation.warnings.offline && (
            <div className="validation-message info-message">
              <AlertTriangle size={15} className="mr-2 shrink-0" />
              {validation.warnings.offline}
            </div>
          )}

          {/* Looker-Studio Split-Vorschau */}
          <div className="p-4 rounded-lg bg-gray-900/60 border border-[var(--border-color)]">
            <h3 className="text-sm font-semibold text-gray-200 mb-3">
              Looker Studio & GA4 Check-Vorschau (Regex-Split)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-xs">
              {[
                ['Source', lookerPreview.source],
                ['Medium', lookerPreview.medium],
                ['Thema', lookerPreview.topic],
                ['Zielgruppe', lookerPreview.audience],
                ['Funnel', lookerPreview.funnel],
                ['Angle', lookerPreview.angle],
                ['Format', lookerPreview.format],
                ['Term', lookerPreview.term],
              ].map(([k, v]) => (
                <div key={k} className="p-2 rounded bg-gray-800 border border-gray-700">
                  <div className="text-gray-400 text-[11px]">{k}</div>
                  <div className="font-mono text-gray-100 truncate" title={v}>
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generierte URL + Link speichern */}
          {canGenerate ? (
            <div className="generated-url-container space-y-5">
              <div>
                <h3>Generierte URL (Check bestanden):</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={fullUrl}
                    readOnly
                    className="flex-1 px-4 py-3 text-sm font-mono bg-gray-900 border border-[var(--border-color)] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className={copySuccess ? 'success' : 'primary'}
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
                <h3>Tracking-Vorlage (nur Parameter):</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={trackingTemplate}
                    readOnly
                    className="flex-1 px-4 py-3 text-sm font-mono bg-gray-900 border border-[var(--border-color)] rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={handleCopyTemplate}
                    className={copyTemplateSuccess ? 'success' : 'secondary'}
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
              <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
                <h3 className="mb-1">Link in Neon speichern</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-300">Notiz / Einsatzort (optional)</label>
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
                  <div>
                    <label className="text-xs text-gray-300">TYPO3 Shortlink / Redirect (optional)</label>
                    <input
                      type="text"
                      value={shortlinkUrl}
                      onChange={(e) => {
                        setShortlinkUrl(e.target.value);
                        setSaveSuccess(false);
                      }}
                      placeholder="z. B. medatixx.de/al-data"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSaveLink}
                    disabled={isSavingLink}
                    className="primary flex items-center gap-2"
                  >
                    <BookmarkPlus size={17} />
                    {isSavingLink ? 'Speichert...' : 'Link speichern'}
                  </button>

                  {saveSuccess && (
                    <span className="text-sm text-[var(--success-color)] flex items-center gap-2">
                      ✓ Link gespeichert!
                      <Link to="/links" className="underline inline-flex items-center gap-1 text-blue-300">
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
            <div className="p-4 rounded-lg bg-gray-800/40 border border-dashed border-[var(--border-color)] text-sm text-gray-400">
              Bitte Base URL, UTM Medium, UTM Source sowie alle 3 Bausteine von UTM Campaign (Thema, Zielgruppe, Funnel) gültig auswählen, um die URL zu generieren und zu speichern.
            </div>
          )}
        </div>
      </div>

      <QuickAddSourceModal
        isOpen={sourceModalOpen}
        onClose={() => setSourceModalOpen(false)}
        user={user}
        initialCategory={sourceModalCategory}
        onCreated={(newSource) => {
          if (onSourceCreated) onSourceCreated(newSource);
          if (['partner', 'location', 'event'].includes(newSource.category)) {
            setSourceMode(newSource.category);
          } else {
            setSourceMode('standard');
          }
          setSource(newSource.slug);
          if (!medium && newSource.default_medium) {
            setMedium(newSource.default_medium);
          }
          if (newSource.shortlink_path) {
            setShortlinkUrl(newSource.shortlink_path);
          }
        }}
      />
    </div>
  );
};

export default UTMBuilder;
