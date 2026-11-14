export const ALLOWED_MEDIUMS = [
  'cpc',
  'paid_social',
  'organic_social',
  'email',
  'display',
  'advertorial',
  'offline',
  'event',
  'referral',
];

export const ALLOWED_FUNNELS = ['tofu', 'mofu', 'bofu', 'retargeting'];

export const SOURCE_CATEGORIES = ['digital', 'publisher', 'offline', 'partner', 'event'];
export const USER_CREATABLE_SOURCE_CATEGORIES = ['partner', 'event'];
export const COMPONENT_TYPES = ['medium', 'topic', 'audience', 'funnel', 'angle', 'format'];

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

export function isValidSlug(value) {
  return typeof value === 'string' && SLUG_REGEX.test(value);
}

export function validateCampaignName(name) {
  if (!name || typeof name !== 'string') {
    return 'Kampagnenname ist erforderlich';
  }
  const parts = name.trim().split('_');
  if (parts.length !== 3) {
    return 'utm_campaign muss exakt das Format [Thema]_[Zielgruppe]_[Funnel] mit genau 2 Unterstrichen haben';
  }
  const [topic, audience, funnel] = parts;
  if (!isValidSlug(topic)) {
    return 'Thema enthält ungültige Zeichen (nur Kleinbuchstaben a-z, Ziffern 0-9 und Bindestriche - erlaubt)';
  }
  if (!isValidSlug(audience)) {
    return 'Zielgruppe enthält ungültige Zeichen (nur Kleinbuchstaben a-z, Ziffern 0-9 und Bindestriche - erlaubt)';
  }
  if (!ALLOWED_FUNNELS.includes(funnel)) {
    return `Funnel muss einer der Werte sein: ${ALLOWED_FUNNELS.join(', ')}`;
  }
  return null;
}

export function validateContentString(content) {
  if (!content) return null;
  if (typeof content !== 'string') return 'utm_content muss eine Zeichenkette sein';
  const parts = content.trim().split('_');
  if (parts.length !== 2) {
    return 'utm_content muss exakt das Format [Angle]_[Format] mit genau 1 Unterstrich haben';
  }
  const [angle, format] = parts;
  if (!isValidSlug(angle) || !isValidSlug(format)) {
    return 'Angle und Format dürfen nur Kleinbuchstaben a-z, Ziffern 0-9 und Bindestriche - enthalten';
  }
  return null;
}

export function validateUtmTerm(term) {
  if (!term) return null;
  if (typeof term !== 'string') return 'utm_term muss eine Zeichenkette sein';
  const trimmed = term.trim();
  if (trimmed === '{keyword}') return null;
  if (!isValidSlug(trimmed)) {
    return 'utm_term darf nur Kleinbuchstaben a-z, Ziffern 0-9 und Bindestriche - enthalten (oder {keyword})';
  }
  return null;
}

export function validateLinkPayload(payload) {
  const {
    base_url,
    full_url,
    tracking_template,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
  } = payload || {};

  if (!base_url || !full_url || !tracking_template) {
    return 'Base-URL, vollständige URL und Tracking-Template sind erforderlich';
  }
  if (!isValidSlug(utm_source)) {
    return 'utm_source ist ungültig (nur Kleinbuchstaben, Ziffern und Bindestriche erlaubt)';
  }
  if (!ALLOWED_MEDIUMS.includes(utm_medium)) {
    return `utm_medium muss ein gültiger GA4-Wert sein: ${ALLOWED_MEDIUMS.join(', ')}`;
  }

  const campaignErr = validateCampaignName(utm_campaign);
  if (campaignErr) return campaignErr;

  const contentErr = validateContentString(utm_content);
  if (contentErr) return contentErr;

  const termErr = validateUtmTerm(utm_term);
  if (termErr) return termErr;

  return null;
}
