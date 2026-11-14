import React, { useMemo } from 'react';
import { CheckCircle2, AlertCircle, Plus } from 'lucide-react';
import { validateUtmCampaignParts } from '../utils/utmValidation';

const CampaignModuleSelector = ({
  topic,
  audience,
  funnel,
  onChangePart,
  topics = [],
  audiences = [],
  funnels = [],
  campaigns = [],
  onSelectFromLibrary,
  showLibraryPicker = true,
  canAddTopic = false,
  onOpenAddTopic,
}) => {
  const assembledCampaign = topic && audience && funnel ? `${topic}_${audience}_${funnel}` : '';
  const validationError =
    topic || audience || funnel
      ? validateUtmCampaignParts(
          { topic, audience, funnel },
          funnels.length > 0 ? funnels.map((f) => f.slug) : undefined
        )
      : 'Bitte Thema, Zielgruppe und Funnel auswählen';

  const sortedCampaigns = useMemo(() => {
    if (!Array.isArray(campaigns)) return [];
    return campaigns
      .filter((c) => !c.archived)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [campaigns]);

  return (
    <div className="section-panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label className="mb-0 text-base font-semibold">
            2. UTM Campaign *{' '}
            <span className="text-xs font-normal text-[var(--text-muted)]">
              ([Thema]_[Zielgruppe]_[Funnel])
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          {canAddTopic && onOpenAddTopic && (
            <button
              type="button"
              onClick={onOpenAddTopic}
              className="secondary text-xs flex items-center gap-1.5 py-2 px-3"
            >
              <Plus size={14} /> Thema anlegen (Admin)
            </button>
          )}

          {showLibraryPicker && sortedCampaigns.length > 0 && (
            <div className="w-full sm:w-72">
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value && onSelectFromLibrary) {
                    onSelectFromLibrary(e.target.value);
                  }
                }}
                className="py-2 text-sm"
              >
                <option value="">-- Aus Kampagnen-Bibliothek laden --</option>
                {sortedCampaigns.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name} ({c.inhaber})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div>
          <label className="field-label">1. Thema *</label>
          <select
            value={topic}
            onChange={(e) => onChangePart('topic', e.target.value)}
          >
            <option value="">-- Thema wählen --</option>
            {topics.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.slug} {item.description ? `— ${item.description}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">2. Zielgruppe *</label>
          <select
            value={audience}
            onChange={(e) => onChangePart('audience', e.target.value)}
          >
            <option value="">-- Zielgruppe wählen --</option>
            {audiences.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.slug} {item.description ? `— ${item.description}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label">3. Funnel *</label>
          <select
            value={funnel}
            onChange={(e) => onChangePart('funnel', e.target.value)}
          >
            <option value="">-- Funnel wählen --</option>
            {funnels.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.slug} {item.description ? `— ${item.description}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        {assembledCampaign && !validationError ? (
          <div className="flex items-center gap-2 text-sm text-[var(--success-color)]">
            <CheckCircle2 size={16} />
            <span>Ergebnis:</span>
            <code className="code-chip">{assembledCampaign}</code>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <AlertCircle size={14} className={validationError && (topic || audience || funnel) ? 'text-[var(--error-color)]' : ''} />
            <span className={validationError && (topic || audience || funnel) ? 'text-[var(--error-color)]' : ''}>
              {validationError}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignModuleSelector;
