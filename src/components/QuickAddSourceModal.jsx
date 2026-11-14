import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  SOURCE_CATEGORY_LABELS,
  buildSourceSlug,
  isDynamicPlatformToken,
  normalizeSlug,
  validateUtmSource,
} from '../utils/utmValidation';

const QuickAddSourceModal = ({
  isOpen,
  onClose,
  user,
  mediumOptions = [],
  initialCategory = 'partner',
  onCreated,
}) => {
  const isAdmin = user?.role === 'admin';
  const availableCategories = useMemo(
    () => (isAdmin ? ['partner', 'event', 'location', 'publisher', 'digital', 'offline'] : ['partner', 'event']),
    [isAdmin]
  );

  const [category, setCategory] = useState(
    availableCategories.includes(initialCategory) ? initialCategory : 'partner'
  );
  const [label, setLabel] = useState('');
  const [customSlug, setCustomSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [usePrefix, setUsePrefix] = useState(false);
  const [defaultMedium, setDefaultMedium] = useState('');
  const [shortlinkPath, setShortlinkPath] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextCat = availableCategories.includes(initialCategory) ? initialCategory : 'partner';
    setCategory(nextCat);
    setLabel('');
    setCustomSlug('');
    setSlugManuallyEdited(false);
    setUsePrefix(nextCat === 'event');
    setDefaultMedium(
      nextCat === 'partner' || nextCat === 'location'
        ? 'offline'
        : nextCat === 'event'
          ? 'event'
          : nextCat === 'publisher'
            ? 'advertorial'
            : ''
    );
    setShortlinkPath('');
    setError('');
  }, [isOpen, initialCategory, availableCategories]);

  useEffect(() => {
    if (!slugManuallyEdited) {
      setCustomSlug(buildSourceSlug(label, category, usePrefix));
    }
  }, [label, category, usePrefix, slugManuallyEdited]);

  if (!isOpen) return null;

  const slugError = customSlug ? validateUtmSource(customSlug) : 'Bitte einen Namen / Slug eingeben';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (slugError) {
      setError(slugError);
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      const res = await fetch('/api/taxonomy', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entityType: 'source',
          slug: customSlug,
          label: label.trim() || customSlug,
          category,
          default_medium: defaultMedium || null,
          allowed_mediums: defaultMedium ? [defaultMedium] : [],
          shortlink_path: shortlinkPath.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Speichern');
      }
      onCreated(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--card-background)] border border-[var(--border-color)] rounded-xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold m-0">
            {isAdmin ? 'Neue Source / Partner / Messe anlegen' : 'Neuen Partner / Messe anlegen'}
          </h3>
          <button type="button" onClick={onClose} className="icon">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label>Kategorie</label>
            <select
              value={category}
              onChange={(e) => {
                const nextCat = e.target.value;
                setCategory(nextCat);
                setSlugManuallyEdited(false);
                if (nextCat === 'partner' || nextCat === 'location') setDefaultMedium('offline');
                else if (nextCat === 'event') setDefaultMedium('event');
                else if (nextCat === 'publisher') setDefaultMedium('advertorial');
              }}
            >
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {SOURCE_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label>
              {category === 'partner'
                ? 'Partner-Name (z. B. Müller GmbH)'
                : category === 'event'
                  ? 'Messe / Event-Name (z. B. München oder interbiologica)'
                  : 'Anzeigename'}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                category === 'partner'
                  ? 'z. B. Praxis-IT Müller'
                  : category === 'event'
                    ? 'z. B. Stuttgart'
                    : 'z. B. Meta Ads dynamisch oder TikTok'
              }
              autoFocus
            />
          </div>

          {(category === 'partner' || category === 'event') && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="w-auto"
                checked={usePrefix}
                onChange={(e) => {
                  setUsePrefix(e.target.checked);
                  setSlugManuallyEdited(false);
                }}
              />
              Automatisches Prefix verwenden ({category === 'partner' ? 'partner-' : 'messe-'})
            </label>
          )}

          <div>
            <label>UTM-Source Slug (automatisch geprüft)</label>
            <input
              type="text"
              value={customSlug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                const val = e.target.value;
                setCustomSlug(isAdmin && isDynamicPlatformToken(val.trim()) ? val.trim() : normalizeSlug(val));
              }}
              className="font-mono text-sm"
              placeholder="z. B. al-data oder {{site_source_name}}"
            />
            {customSlug && !slugError ? (
              <p className="text-xs text-[var(--success-color)] mt-1 mb-0 flex items-center gap-1">
                <CheckCircle2 size={14} /> Gültiger Slug: <code>{customSlug}</code>
              </p>
            ) : (
              customSlug && (
                <p className="text-xs text-[var(--error-color)] mt-1 mb-0 flex items-center gap-1">
                  <AlertCircle size={14} /> {slugError}
                </p>
              )
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label>Standard-Medium (optional)</label>
              <select
                value={defaultMedium}
                onChange={(e) => setDefaultMedium(e.target.value)}
              >
                <option value="">-- Kein Standard --</option>
                {mediumOptions.map((m) => (
                  <option key={m.slug} value={m.slug}>
                    {m.slug}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>TYPO3 Shortlink (optional)</label>
              <input
                type="text"
                value={shortlinkPath}
                onChange={(e) => setShortlinkPath(e.target.value)}
                placeholder="medatixx.de/..."
              />
            </div>
          </div>

          {error && (
            <div className="validation-message error-message">
              <AlertCircle size={16} className="mr-2 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="secondary">
              Abbrechen
            </button>
            <button
              type="submit"
              className="primary flex items-center gap-1.5"
              disabled={isSaving || Boolean(slugError)}
            >
              <Plus size={16} />
              {isSaving ? 'Speichert...' : 'In Neon speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddSourceModal;
