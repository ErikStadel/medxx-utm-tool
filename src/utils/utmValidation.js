export const SOURCE_CATEGORY_LABELS = {
  digital: 'Digital (Paid & Organic)',
  publisher: 'Fachportale / Publisher',
  offline: 'Offline / Print',
  partner: 'Service-Partner',
  location: 'Standorte / Niederlassungen',
  event: 'Messen & Events',
};

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DYNAMIC_PLATFORM_TOKEN_REGEX = /^\{\{[a-z0-9_]+\}\}$/;

/**
 * Normalisiert beliebige Eingaben in ein Looker-Studio-sicheres Kleinschreibungs-Slug-Format.
 * Ersetzt Umlaute, Leerzeichen und Unterstriche durch Bindestriche.
 */
export function normalizeSlug(value) {
  if (!value || typeof value !== 'string') return '';
  return value
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Erzeugt einen standardisierten Source-Slug für Partner oder Messen.
 */
export function buildSourceSlug(rawName, category, usePrefix = false) {
  const normalized = normalizeSlug(rawName);
  if (!normalized) return '';
  if (!usePrefix) return normalized;

  if (category === 'partner') {
    if (normalized === 'service-partner' || normalized.startsWith('partner-') || normalized.startsWith('sp-')) {
      return normalized;
    }
    return `partner-${normalized}`;
  }

  if (category === 'event') {
    if (normalized.startsWith('messe-')) {
      return normalized;
    }
    return `messe-${normalized}`;
  }

  return normalized;
}

export function isValidSlug(value) {
  return typeof value === 'string' && SLUG_REGEX.test(value);
}

export function isDynamicPlatformToken(value) {
  return typeof value === 'string' && DYNAMIC_PLATFORM_TOKEN_REGEX.test(value.trim());
}

/**
 * Prüft einen einzelnen Baustein auf Einhaltung der Zeichenregeln.
 */
export function validateSlugModule(value, fieldLabel) {
  if (!value || !value.trim()) {
    return `${fieldLabel} ist erforderlich`;
  }
  const trimmed = value.trim();
  if (/[A-Z]/.test(trimmed)) {
    return `${fieldLabel} muss komplett kleingeschrieben sein`;
  }
  if (/[äöüß]/i.test(trimmed)) {
    return `${fieldLabel} darf keine Umlaute oder ß enthalten (ä->ae, ö->oe, ü->ue, ß->ss)`;
  }
  if (trimmed.includes('_')) {
    return `${fieldLabel} darf keinen Unterstrich (_) enthalten – innerhalb eines Moduls nur Bindestrich (-) verwenden`;
  }
  if (/\s/.test(trimmed)) {
    return `${fieldLabel} darf keine Leerzeichen enthalten`;
  }
  if (!isValidSlug(trimmed)) {
    return `${fieldLabel} darf nur Kleinbuchstaben (a-z), Ziffern (0-9) und Bindestriche (-) enthalten`;
  }
  return null;
}

export function validateUtmSource(value, activeSources = null, isNewPublisher = false) {
  if (!value || !value.trim()) {
    return 'utm_source ist erforderlich';
  }
  const trimmed = value.trim();

  if (!isDynamicPlatformToken(trimmed)) {
    const slugErr = validateSlugModule(trimmed, 'utm_source');
    if (slugErr) return slugErr;
  }

  if (!isNewPublisher && Array.isArray(activeSources) && activeSources.length > 0) {
    const exists = activeSources.some((s) => s.slug === trimmed);
    if (!exists) {
      return `utm_source "${trimmed}" ist nicht in der Datenbank hinterlegt`;
    }
  }

  return null;
}

export function validateUtmMedium(value, allowedMediums = null) {
  if (!value || !value.trim()) {
    return 'utm_medium ist erforderlich';
  }
  if (Array.isArray(allowedMediums) && allowedMediums.length > 0 && !allowedMediums.includes(value)) {
    return `utm_medium "${value}" ist für diese Konfiguration nicht erlaubt`;
  }
  return null;
}

export function validateUtmCampaignParts({ topic, audience, funnel }, allowedFunnels = null) {
  const topicErr = validateSlugModule(topic, 'Thema');
  if (topicErr) return topicErr;

  const audienceErr = validateSlugModule(audience, 'Zielgruppe');
  if (audienceErr) return audienceErr;

  if (!funnel || !funnel.trim()) {
    return 'Funnel ist erforderlich';
  }
  const funnelErr = validateSlugModule(funnel, 'Funnel');
  if (funnelErr) return funnelErr;

  if (Array.isArray(allowedFunnels) && allowedFunnels.length > 0 && !allowedFunnels.includes(funnel)) {
    return `Funnel muss einer der Werte aus der Datenbank sein: ${allowedFunnels.join(', ')}`;
  }
  return null;
}

export function validateUtmCampaignString(value, allowedFunnels = null) {
  if (!value || !value.trim()) {
    return 'utm_campaign ist erforderlich';
  }
  const trimmed = value.trim();
  const parts = trimmed.split('_');
  if (parts.length !== 3) {
    return `utm_campaign muss genau 2 Unterstriche für [Thema]_[Zielgruppe]_[Funnel] enthalten (aktuell ${parts.length - 1})`;
  }
  return validateUtmCampaignParts(
    { topic: parts[0], audience: parts[1], funnel: parts[2] },
    allowedFunnels
  );
}

export function validateUtmContentParts({ angle, format }) {
  const hasAngle = Boolean(angle && angle.trim());
  const hasFormat = Boolean(format && format.trim());

  if (!hasAngle && !hasFormat) {
    return null;
  }
  if (hasAngle && !hasFormat) {
    return 'Bitte für utm_content auch ein Format wählen (oder Angle wieder leeren)';
  }
  if (!hasAngle && hasFormat) {
    return 'Bitte für utm_content auch einen Angle wählen (oder Format wieder leeren)';
  }

  const angleErr = validateSlugModule(angle, 'Angle');
  if (angleErr) return angleErr;

  const formatErr = validateSlugModule(format, 'Format');
  if (formatErr) return formatErr;

  return null;
}

export function validateUtmContentString(value) {
  if (!value || !value.trim()) return null;
  const parts = value.trim().split('_');
  if (parts.length !== 2) {
    return `utm_content muss genau 1 Unterstrich für [Angle]_[Format] enthalten (aktuell ${parts.length - 1})`;
  }
  return validateUtmContentParts({ angle: parts[0], format: parts[1] });
}

export function validateUtmTerm(value) {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  if (/^\{[a-z0-9_]+\}$/i.test(trimmed)) return null;
  return validateSlugModule(trimmed, 'utm_term');
}

export function validateCustomParams(value) {
  if (!value || !value.trim()) return null;
  const pairs = value.split('&').map((pair) => pair.trim());
  for (const pair of pairs) {
    if (!pair) {
      return 'Leere Parameter zwischen & sind nicht erlaubt';
    }
    if (!pair.includes('=')) {
      return 'Format muss [Parameter]=[Wert] sein, z. B. param1=wert1';
    }
    const [k, v] = pair.split('=');
    if (!k || !v) {
      return 'Parametername und Wert dürfen nicht leer sein';
    }
  }
  return null;
}

export function validateBaseUrl(value) {
  if (!value || !value.trim()) {
    return 'Base URL ist erforderlich';
  }
  const normalized = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;
  try {
    const parsed = new URL(normalized);
    if (!parsed.hostname || !parsed.hostname.includes('.')) {
      return 'Bitte eine gültige Domain angeben (z. B. https://medatixx.de/seite)';
    }
  } catch {
    return 'Ungültiges URL-Format';
  }
  return null;
}

/**
 * Führt den vollständigen Check über alle Parameter inklusive Plausibilitäts-Warnungen durch.
 */
export function validateFullUtmState(
  state,
  { sources = [], allowedMediums = null, allowedFunnels = null, isNewPublisher = false } = {}
) {
  const errors = {};
  const warnings = {};

  const baseUrlErr = validateBaseUrl(state.baseUrl);
  if (baseUrlErr) errors.baseUrl = baseUrlErr;

  const mediumErr = validateUtmMedium(state.medium, allowedMediums);
  if (mediumErr) errors.medium = mediumErr;

  const sourceErr = validateUtmSource(state.source, sources, isNewPublisher);
  if (sourceErr) errors.source = sourceErr;

  const campaignErr = validateUtmCampaignParts(
    { topic: state.topic, audience: state.audience, funnel: state.funnel },
    allowedFunnels
  );
  if (campaignErr) errors.campaign = campaignErr;

  const contentErr = validateUtmContentParts({ angle: state.angle, format: state.format });
  if (contentErr) errors.content = contentErr;

  const termErr = validateUtmTerm(state.term);
  if (termErr) errors.term = termErr;

  const customErr = validateCustomParams(state.customParams);
  if (customErr) errors.customParams = customErr;

  if (state.source && state.medium && Array.isArray(sources) && sources.length > 0) {
    const sourceObj = sources.find((s) => s.slug === state.source);
    if (sourceObj && Array.isArray(sourceObj.allowed_mediums) && sourceObj.allowed_mediums.length > 0) {
      if (!sourceObj.allowed_mediums.includes(state.medium)) {
        errors.source = `"${state.source}" ist für das Medium "${state.medium}" nicht erlaubt (erlaubt: ${sourceObj.allowed_mediums.join(', ')}).`;
      }
    }
  }

  if (isDynamicPlatformToken(state.source) && state.medium && state.medium !== 'paid_social') {
    warnings.sourceMedium = `Der dynamische Platzhalter ${state.source} wird nur in bezahlten Social-Ads (z. B. paid_social) automatisch aufgelöst.`;
  }

  if (state.term === '{keyword}' && state.medium && state.medium !== 'cpc') {
    warnings.term = 'Der dynamische Platzhalter {keyword} ist für Google Ads (utm_medium=cpc) gedacht.';
  }

  if (state.medium === 'offline') {
    warnings.offline =
      'Offline-Pro-Tipp: Für QR-Codes auf Rollups oder Print-Mailings eine TYPO3-Short-URL auf diese UTM-URL weiterleiten und unten dokumentieren.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
}

/**
 * Erzeugt die Vorschau, wie Looker Studio / GA4 die Parameter anhand von "_" aufteilt.
 */
export function getLookerStudioPreview({ source, medium, topic, audience, funnel, angle, format, term }) {
  const campaign = topic && audience && funnel ? `${topic}_${audience}_${funnel}` : '';
  const content = angle && format ? `${angle}_${format}` : '';
  return {
    source: source || '—',
    medium: medium || '—',
    campaign: campaign || '—',
    topic: topic || '—',
    audience: audience || '—',
    funnel: funnel || '—',
    content: content || '—',
    angle: angle || '—',
    format: format || '—',
    term: term || '—',
  };
}
