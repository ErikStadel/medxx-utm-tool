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
    <div className="section-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="mb-0 text-base font-semibold">
          3. UTM Content (optional){' '}
          <span className="text-xs font-normal text-[var(--text-muted)]">([Angle]_[Format])</span>
        </label>
        {(angle || format) && (
          <button
            type="button"
            onClick={() => {
              onChangePart('angle', '');
              onChangePart('format', '');
            }}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-color)] underline px-2 py-1"
          >
            Leeren
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label className="field-label">1. Angle (Werbebotschaft)</label>
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
          <label className="field-label">2. Format (Werbemittel / Träger)</label>
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
          <code className="code-chip">{assembledContent}</code>
        </div>
      ) : (
        <p className="text-xs text-[var(--text-muted)] mb-0">
          Optional – wenn genutzt, immer Angle & Format gemeinsam wählen (genau 1 Unterstrich).
        </p>
      )}
    </div>
  );
};

export default ContentModuleSelector;
