import {
  normalizeSlug,
  buildSourceSlug,
  validateUtmSource,
  validateUtmMedium,
  validateUtmCampaignParts,
  validateUtmCampaignString,
  validateUtmContentParts,
  validateUtmContentString,
  validateUtmTerm,
  validateFullUtmState,
} from './utmValidation';

describe('normalizeSlug', () => {
  test('wandelt Großbuchstaben, Umlaute, ß, Leerzeichen und Unterstriche korrekt um', () => {
    expect(normalizeSlug('Praxis Müller & Söhne')).toBe('praxis-mueller-soehne');
    expect(normalizeSlug('Straße_Test  Groß')).toBe('strasse-test-gross');
    expect(normalizeSlug('KI in der Praxis')).toBe('ki-in-der-praxis');
    expect(normalizeSlug('  --healthhub__test--  ')).toBe('healthhub-test');
  });
});

describe('buildSourceSlug', () => {
  test('ergänzt partner- und messe-Prefixe intelligent', () => {
    expect(buildSourceSlug('Müller GmbH', 'partner', true)).toBe('partner-mueller-gmbh');
    expect(buildSourceSlug('partner-nord', 'partner', true)).toBe('partner-nord');
    expect(buildSourceSlug('service-partner', 'partner', true)).toBe('service-partner');
    expect(buildSourceSlug('München', 'event', true)).toBe('messe-muenchen');
    expect(buildSourceSlug('interbiologica', 'event', false)).toBe('interbiologica');
  });
});

describe('Konzept-Fallbeispiele Validierung', () => {
  test('akzeptiert alle Beispiele aus dem medatixx UTM-Konzept', () => {
    const cases = [
      {
        baseUrl: 'https://medatixx.de/xscribe',
        source: 'linkedin',
        medium: 'paid_social',
        topic: 'xscribe',
        audience: 'aerzte-allg',
        funnel: 'tofu',
        angle: 'pain',
        format: 'image',
        term: 'jobtitel-niedergelassen',
      },
      {
        baseUrl: 'https://medatixx.de/fruehbucher',
        source: 'print',
        medium: 'offline',
        topic: 'isynet-fruehbucher',
        audience: 'bk-isynet',
        funnel: 'bofu',
        angle: 'promo',
        format: 'qr-code',
      },
      {
        baseUrl: 'https://medatixx.de/ki',
        source: 'aerzteblatt',
        medium: 'advertorial',
        topic: 'ki-in-der-praxis',
        audience: 'mfas',
        funnel: 'mofu',
        angle: 'edu',
        format: 'text',
      },
      {
        baseUrl: 'https://medatixx.de/praxissoftware',
        source: 'google',
        medium: 'cpc',
        topic: 'praxissoftware',
        audience: 'aerzte-allg',
        funnel: 'bofu',
        angle: 'feature',
        format: 'text',
        term: '{keyword}',
      },
      {
        baseUrl: 'https://medatixx.de/partner',
        source: 'partner-mueller',
        medium: 'offline',
        topic: 'healthhub',
        audience: 'aerzte-allg',
        funnel: 'mofu',
        angle: 'feature',
        format: 'rollup',
      },
      {
        baseUrl: 'https://medatixx.de/messe-lead',
        source: 'messe-muenchen',
        medium: 'event',
        topic: 'stand-tablet',
        audience: 'aerzte-allg',
        funnel: 'bofu',
        angle: 'lead-erfassung',
        format: 'tablet',
      },
    ];

    cases.forEach((c) => {
      const res = validateFullUtmState(c);
      expect(res.isValid).toBe(true);
      expect(res.errors).toEqual({});
    });
  });

  test('verhindert Großbuchstaben, Umlaute, Unterstriche innerhalb Modulen und ungültige Mediums/Funnels aus der DB', () => {
    const dbMediums = ['cpc', 'paid_social', 'organic_social', 'advertorial', 'display', 'email', 'offline', 'event', 'referral'];
    const dbFunnels = ['tofu', 'mofu', 'bofu', 'retargeting'];
    const dbSources = [
      { slug: 'google', allowed_mediums: ['cpc', 'display'] },
      { slug: 'tiktok', allowed_mediums: ['paid_social', 'organic_social'] },
    ];

    expect(validateUtmSource('LinkedIn')).toBeTruthy();
    expect(validateUtmSource('partner_mueller')).toBeTruthy();
    expect(validateUtmSource('ärzteblatt')).toBeTruthy();
    expect(validateUtmSource('tiktok', dbSources)).toBeNull();
    expect(validateUtmSource('unbekannt', dbSources, false)).toBeTruthy();
    expect(validateUtmSource('neuer-publisher', dbSources, true)).toBeNull();

    expect(validateUtmMedium('aff', dbMediums)).toBeTruthy();
    expect(validateUtmMedium('paid_social', dbMediums)).toBeNull();

    expect(
      validateUtmCampaignParts(
        {
          topic: 'ki_praxis',
          audience: 'aerzte-allg',
          funnel: 'mofu',
        },
        dbFunnels
      )
    ).toBeTruthy();

    expect(
      validateUtmCampaignParts(
        {
          topic: 'healthhub',
          audience: 'aerzte-allg',
          funnel: 'unknown',
        },
        dbFunnels
      )
    ).toBeTruthy();

    expect(validateUtmCampaignString('healthhub_aerzte-allg', dbFunnels)).toBeTruthy();
    expect(validateUtmCampaignString('healthhub_aerzte_allg_mofu', dbFunnels)).toBeTruthy();
    expect(validateUtmCampaignString('healthhub_aerzte-allg_mofu', dbFunnels)).toBeNull();
  });

  test('akzeptiert alle 17 definierten Kampagnen-Themen als gültige Campaign-Bausteine', () => {
    const allTopics = [
      'regulatorik',
      'regulatorik-2027',
      'zukunft-endspurt',
      'fit-fuer-medatixx',
      'ki-in-der-praxis',
      'praxissoftware',
      'meet-medatixx',
      'adventskalender',
      'stand-tablet',
      'bk-aktion',
      'healthhub',
      'clinical-intelligence',
      'xscribe',
      'private-cloud',
      'isynet-fruehbucher',
      'ti-bundle',
      'psyx',
    ];
    const dbFunnels = ['tofu', 'mofu', 'bofu', 'retargeting'];

    allTopics.forEach((topic) => {
      expect(
        validateUtmCampaignParts(
          { topic, audience: 'aerzte-allg', funnel: 'tofu' },
          dbFunnels
        )
      ).toBeNull();
    });
  });

  test('prüft utm_content Paar-Vollständigkeit und genau 1 Unterstrich', () => {
    expect(validateUtmContentParts({ angle: '', format: '' })).toBeNull();
    expect(validateUtmContentParts({ angle: 'pain', format: '' })).toBeTruthy();
    expect(validateUtmContentParts({ angle: '', format: 'image' })).toBeTruthy();
    expect(validateUtmContentParts({ angle: 'pain', format: 'image' })).toBeNull();
    expect(validateUtmContentString('pain_image_extra')).toBeTruthy();
    expect(validateUtmContentString('pain_image')).toBeNull();
  });

  test('prüft utm_term und Warnungen', () => {
    expect(validateUtmTerm('{keyword}')).toBeNull();
    expect(validateUtmTerm('jobtitel-niedergelassen')).toBeNull();
    expect(validateUtmTerm('Invalid Term')).toBeTruthy();

    const offlineResult = validateFullUtmState({
      baseUrl: 'https://medatixx.de',
      source: 'print',
      medium: 'offline',
      topic: 'healthhub',
      audience: 'aerzte-allg',
      funnel: 'mofu',
      angle: 'promo',
      format: 'mailing-qr',
    });
    expect(offlineResult.isValid).toBe(true);
    expect(offlineResult.warnings.offline).toBeTruthy();
  });

  test('akzeptiert alle offiziellen Service-Partner- und Standort-Tracking-IDs', () => {
    const partnerAndLocationIds = [
      'al-data', 'as-rheinland', 'bauer-medical', 'nc-neumann', 'comprax',
      'cs-mentz', 'comretix', 'comservice', 'ddd', 'delfs', 'digital-symptom',
      'doctago', 'eifert-ds', 'engel', 'erhardt-it', 'fleig-schmieder', 'hms',
      'hoenicke', 'hoppemed', 'ics-as-burgert', 'ics', 'intrakom', 'it-sh-jerg',
      'itl-sh', 'kobus-datentechnik', 'lachnit-edv', 'lcs', 'm-its',
      'medical-future', 'medip-it', 'medis', 'mednext', 'metis',
      'opitz-computer', 'piwinger-lau', 'reichle', 'richtersystem',
      'starke-reichert', 'support-four-it', 'sh-bergholz', 'tbs-computer',
      'topas', 'varicom', 'werremeyer-edv', 'woinke',
      'nl-nord', 'nl-ost', 'nl-sued', 'nl-west', 'z-ba', 'z-elt',
    ];

    partnerAndLocationIds.forEach((slug) => {
      expect(validateUtmSource(slug)).toBeNull();
    });
  });

  test('akzeptiert {{site_source_name}} aus der DB für Meta Paid Social und blockiert unzulässige Medien', () => {
    const dbSources = [
      { slug: '{{site_source_name}}', allowed_mediums: ['paid_social'] },
    ];
    expect(validateUtmSource('{{site_source_name}}', dbSources)).toBeNull();

    const paidMeta = validateFullUtmState(
      {
        baseUrl: 'https://medatixx.de',
        source: '{{site_source_name}}',
        medium: 'paid_social',
        topic: 'healthhub',
        audience: 'aerzte-allg',
        funnel: 'tofu',
        angle: 'pain',
        format: 'image',
      },
      { sources: dbSources, allowedMediums: ['paid_social', 'organic_social'], allowedFunnels: ['tofu', 'mofu', 'bofu'] }
    );
    expect(paidMeta.isValid).toBe(true);
    expect(paidMeta.warnings.sourceMedium).toBeUndefined();

    const blockedByDb = validateFullUtmState(
      {
        baseUrl: 'https://medatixx.de',
        source: '{{site_source_name}}',
        medium: 'organic_social',
        topic: 'healthhub',
        audience: 'aerzte-allg',
        funnel: 'tofu',
      },
      { sources: dbSources, allowedMediums: ['paid_social', 'organic_social'], allowedFunnels: ['tofu', 'mofu', 'bofu'] }
    );
    expect(blockedByDb.isValid).toBe(false);
    expect(blockedByDb.errors.source).toBeTruthy();
    expect(blockedByDb.warnings.sourceMedium).toBeTruthy();
  });
});
