import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { validateUtmContentParts } from '../utils/utmValidation';

const ContentModuleSelector = ({
  angle,
  format,
  onChangePart,
  angles = [],
  formats = [],
}) => {
  const assembledContent = angle && format ? `${angle}_${format}` : '';
  const validationError = validateUtmContentParts({ angle, format });

  return (
    <div className="p-4 rounded-lg bg-gray-800/60 border border-[var(--border-color)] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="mb-0 text-base font-semibold">
          UTM Content (optional){' '}
          <span className="text-xs font-normal text-gray-400">([Angle]_[Format])</span>
        </label>
        {(angle || format) && (
          <button
            type="button"
            onClick={() => {
              onChangePart('angle', '');
              onChangePart('format', '');
            }}
            className="text-xs text-gray-400 hover:text-white underline px-2 py-1"
          >
            Leeren
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-gray-400">1. Angle (Werbebotschaft)</label>
          <select value={angle} onChange={(e) => onChangePart('angle', e.target.value)}>
            <option value="">-- Kein Angle --</option>
            {angles.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.slug} {item.description ? `— ${item.description}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-gray-400">2. Format (Werbemittel / Träger)</label>
          <select value={format} onChange={(e) => onChangePart('format', e.target.value)}>
            <option value="">-- Kein Format --</option>
            {formats.map((item) => (
              <option key={item.slug} value={item.slug}>
                {item.slug} {item.description ? `— ${item.description}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {validationError ? (
        <div className="flex items-center gap-2 text-xs text-[var(--error-color)]">
          <AlertCircle size={15} />
          <span>{validationError}</span>
        </div>
      ) : assembledContent ? (
        <div className="flex items-center gap-2 text-sm text-[var(--success-color)]">
          <CheckCircle2 size={16} />
          <span>Ergebnis:</span>
          <code className="px-2 py-0.5 rounded bg-gray-900 border border-green-700/50 text-green-300 font-mono">
            {assembledContent}
          </code>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mb-0">
          Optional – wenn genutzt, immer Angle & Format gemeinsam wählen (genau 1 Unterstrich).
        </p>
      )}
    </div>
  );
};

export default ContentModuleSelector;
