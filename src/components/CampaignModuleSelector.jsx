import React, { useMemo } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
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
    <div className="p-4 rounded-lg bg-gray-800/60 border border-[var(--border-color)] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <label className="mb-0 text-base font-semibold">
            UTM Campaign * <span className="text-xs font-normal text-gray-400">([Thema]_[Zielgruppe]_[Funnel])</span>
          </label>
        </div>

        {showLibraryPicker && sortedCampaigns.length > 0 && (
          <div className="w-full md:w-72">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-400">1. Thema *</label>
          <select
            value={topic}
            onChange={(e) => onChangePart('topic', e.target.value)}
            className={!topic ? 'border-gray-600' : ''}
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
          <label className="text-xs uppercase tracking-wide text-gray-400">2. Zielgruppe *</label>
          <select
            value={audience}
            onChange={(e) => onChangePart('audience', e.target.value)}
            className={!audience ? 'border-gray-600' : ''}
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
          <label className="text-xs uppercase tracking-wide text-gray-400">3. Funnel *</label>
          <select
            value={funnel}
            onChange={(e) => onChangePart('funnel', e.target.value)}
            className={!funnel ? 'border-gray-600' : ''}
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
            <code className="px-2 py-0.5 rounded bg-gray-900 border border-green-700/50 text-green-300 font-mono">
              {assembledCampaign}
            </code>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-300">
            <AlertCircle size={15} />
            <span>{validationError}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignModuleSelector;
