-- Database Schema for medxx-utm-tool
-- Can be executed directly in Neon / PostgreSQL SQL Editor (idempotent)

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'standard',
    password VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(255) NOT NULL,
    archived BOOLEAN DEFAULT FALSE,
    inhaber VARCHAR(255) NOT NULL DEFAULT 'alle',
    topic_slug VARCHAR(120),
    audience_slug VARCHAR(120),
    funnel_slug VARCHAR(50)
);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS topic_slug VARCHAR(120);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS audience_slug VARCHAR(120);
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS funnel_slug VARCHAR(50);

-- Sources: Plattformen, Fachportale/Publisher, Offline, Service-Partner, Standorte, Messen/Events
CREATE TABLE IF NOT EXISTS utm_sources (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(120) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    default_medium VARCHAR(50),
    allowed_mediums TEXT[] DEFAULT '{}',
    shortlink_path VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Modulare Bausteine & GA4-Standards (medium, topic, audience, funnel, angle, format)
CREATE TABLE IF NOT EXISTS utm_components (
    id SERIAL PRIMARY KEY,
    component_type VARCHAR(50) NOT NULL,
    slug VARCHAR(120) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_locked BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_by VARCHAR(255) NOT NULL DEFAULT 'system',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (component_type, slug)
);

-- Gespeicherte UTM-Links (Historie / Tracking-Übersicht)
CREATE TABLE IF NOT EXISTS saved_links (
    id SERIAL PRIMARY KEY,
    base_url TEXT NOT NULL,
    full_url TEXT NOT NULL,
    tracking_template TEXT NOT NULL,
    utm_source VARCHAR(120) NOT NULL,
    utm_medium VARCHAR(50) NOT NULL,
    utm_campaign VARCHAR(255) NOT NULL,
    utm_content VARCHAR(255),
    utm_term VARCHAR(255),
    custom_params TEXT,
    shortlink_url VARCHAR(255),
    note TEXT,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Initial Admin User (names are stored in lowercase)
INSERT INTO users (name, role)
VALUES ('admin', 'admin')
ON CONFLICT (name) DO NOTHING;

-- Seed: GA4-konforme utm_medium Standards (gesperrt)
INSERT INTO utm_components (component_type, slug, label, description, sort_order, is_locked)
VALUES
    ('medium', 'cpc', 'cpc', 'Search / SEA (Google Ads)', 10, TRUE),
    ('medium', 'paid_social', 'paid_social', 'Meta, LinkedIn, TikTok Ads', 20, TRUE),
    ('medium', 'organic_social', 'organic_social', 'Unbezahlte Social-Posts', 30, TRUE),
    ('medium', 'email', 'email', 'Newsletter, Mailings via CleverReach / SFMC', 40, TRUE),
    ('medium', 'display', 'display', 'Banner auf Fachportalen, GDN', 50, TRUE),
    ('medium', 'advertorial', 'advertorial', 'Bezahlte Online-Fachartikel / Sponsored Content', 60, TRUE),
    ('medium', 'offline', 'offline', 'Print-Mailings, Flyer, Postkarten, Partner-Rollups', 70, TRUE),
    ('medium', 'event', 'event', 'Messen, Kongresse, Roadshows, Tablet-Erfassung', 80, TRUE),
    ('medium', 'referral', 'referral', 'Unbezahlte Partner-Verlinkungen', 90, TRUE)
ON CONFLICT (component_type, slug) DO NOTHING;

-- Seed: utm_campaign Modul A - [Thema] (vollständiger Katalog: Dach, Events/Aktionen, Lösungen/Produkte)
INSERT INTO utm_components (component_type, slug, label, description, sort_order, is_locked)
VALUES
    -- A) Übergeordnete Dach- & Imagekampagnen
    ('topic', 'regulatorik', 'regulatorik', 'Regulatorik-Themen (allgemein)', 10, FALSE),
    ('topic', 'regulatorik-2027', 'regulatorik-2027', 'Geplante Dachkampagne Regulatorik 2027', 15, FALSE),
    ('topic', 'zukunft-endspurt', 'zukunft-endspurt', 'Jahresendspurt-Kampagne (medatixx / psyx)', 20, FALSE),
    ('topic', 'fit-fuer-medatixx', 'fit-fuer-medatixx', 'Fit für medatixx', 25, FALSE),
    ('topic', 'ki-in-der-praxis', 'ki-in-der-praxis', 'Themen-Hub rund um KI-Anwendungen', 30, FALSE),
    ('topic', 'praxissoftware', 'praxissoftware', 'Generische Always-On / Search-Kampagnen', 35, FALSE),
    -- B) Events, Formate & Aktionen
    ('topic', 'meet-medatixx', 'meet-medatixx', 'Online-Eventreihe (z. B. HealthHub-Showcase)', 40, FALSE),
    ('topic', 'adventskalender', 'adventskalender', 'Adventskalender-Aktion', 45, FALSE),
    ('topic', 'stand-tablet', 'stand-tablet', 'Lead-Erfassung vor Ort auf Messen/Kongressen', 50, FALSE),
    ('topic', 'bk-aktion', 'bk-aktion', 'Allgemeine Bestandskunden-Aktionen (z. B. Q4)', 55, FALSE),
    -- C) Lösungs- & Produkt-Initiativen
    ('topic', 'healthhub', 'healthhub', 'HealthHub (inkl. Aktionen/Upgrades)', 60, FALSE),
    ('topic', 'clinical-intelligence', 'clinical-intelligence', 'Clinical Intelligence', 65, FALSE),
    ('topic', 'xscribe', 'xscribe', 'x.scribe Transkription', 70, FALSE),
    ('topic', 'private-cloud', 'private-cloud', 'Private Cloud', 75, FALSE),
    ('topic', 'isynet-fruehbucher', 'isynet-fruehbucher', 'x.isynet Frühbucher-Angebot', 80, FALSE),
    ('topic', 'ti-bundle', 'ti-bundle', 'Telematikinfrastruktur-Angebote', 85, FALSE),
    ('topic', 'psyx', 'psyx', 'Spezifische Kampagnen für die Psychotherapie-Linie', 90, FALSE)
ON CONFLICT (component_type, slug) DO NOTHING;

-- Seed: utm_campaign Modul B - [Zielgruppe]
INSERT INTO utm_components (component_type, slug, label, description, sort_order, is_locked)
VALUES
    ('audience', 'aerzte-allg', 'aerzte-allg', 'Ärzte allgemein / Niedergelassene', 10, FALSE),
    ('audience', 'mfas', 'mfas', 'Medizinische Fachangestellte / Praxismanagement', 20, FALSE),
    ('audience', 'psychotherapeuten', 'psychotherapeuten', 'Psychotherapeuten (psyx-relevant)', 30, FALSE),
    ('audience', 'mvz', 'mvz', 'Medizinische Versorgungszentren', 40, FALSE),
    ('audience', 'bk-isynet', 'bk-isynet', 'Bestandskunden x.isynet', 50, FALSE),
    ('audience', 'bk-medatixx', 'bk-medatixx', 'Bestandskunden medatixx', 60, FALSE),
    ('audience', 'bk-psyx', 'bk-psyx', 'Bestandskunden psyx', 70, FALSE),
    ('audience', 'bk-allg', 'bk-allg', 'Bestandskunden allgemein', 80, FALSE),
    ('audience', 'engaged-audience', 'engaged-audience', 'Warmes Publikum / Interaktoren', 90, FALSE),
    ('audience', 'lookalike', 'lookalike', 'Lookalike Audiences', 100, FALSE),
    ('audience', 'niederlassung', 'niederlassung', 'Existenzgründer / Neu-Niederlassung', 110, FALSE)
ON CONFLICT (component_type, slug) DO NOTHING;

-- Seed: utm_campaign Modul C - [Funnel] (gesperrt)
INSERT INTO utm_components (component_type, slug, label, description, sort_order, is_locked)
VALUES
    ('funnel', 'tofu', 'tofu', 'Top of Funnel / Awareness', 10, TRUE),
    ('funnel', 'mofu', 'mofu', 'Middle of Funnel / Consideration & Educating', 20, TRUE),
    ('funnel', 'bofu', 'bofu', 'Bottom of Funnel / Conversion, Termin, Demo, Kauf', 30, TRUE),
    ('funnel', 'retargeting', 'retargeting', 'Wiederansprache', 40, TRUE)
ON CONFLICT (component_type, slug) DO NOTHING;

-- Seed: utm_content Modul A - [Angle]
INSERT INTO utm_components (component_type, slug, label, description, sort_order, is_locked)
VALUES
    ('angle', 'pain', 'pain', 'Pain Point / Schmerzpunkt (z. B. Doku-Frust, Zeitmangel)', 10, FALSE),
    ('angle', 'edu', 'edu', 'Educative / Informativ, Aufklärung, Leitfaden', 20, FALSE),
    ('angle', 'trust', 'trust', 'Social Proof / Kundenstimmen, Marktführerschaft', 30, FALSE),
    ('angle', 'feature', 'feature', 'Konkreter Produkt-/Funktionsfokus', 40, FALSE),
    ('angle', 'promo', 'promo', 'Angebot, Rabatt, Frühbucher, Dringlichkeit', 50, FALSE),
    ('angle', 'lead-erfassung', 'lead-erfassung', 'Funktionale Formulare (z. B. Messe-Tablets)', 60, FALSE)
ON CONFLICT (component_type, slug) DO NOTHING;

-- Seed: utm_content Modul B - [Format]
INSERT INTO utm_components (component_type, slug, label, description, sort_order, is_locked)
VALUES
    ('format', 'image', 'image', 'Single Image', 10, FALSE),
    ('format', 'carousel', 'carousel', 'Carousel Ad', 20, FALSE),
    ('format', 'video', 'video', 'Video Ad', 30, FALSE),
    ('format', 'text', 'text', 'Text-Ad, Advertorial-Artikel, Newsletter-Textlink', 40, FALSE),
    ('format', 'banner', 'banner', 'Display-Banner', 50, FALSE),
    ('format', 'qr-code', 'qr-code', 'QR-Code auf Flyern, Postkarten, Briefen', 60, FALSE),
    ('format', 'rollup', 'rollup', 'Rollup / QR-Code auf Rollup', 70, FALSE),
    ('format', 'rollup-qr', 'rollup-qr', 'QR-Code auf Partner-Rollup', 75, FALSE),
    ('format', 'mailing-qr', 'mailing-qr', 'QR-Code auf Print-Mailing / Brief', 80, FALSE),
    ('format', 'postkarte-qr', 'postkarte-qr', 'QR-Code auf Postkarte', 85, FALSE),
    ('format', 'tablet', 'tablet', 'Messe-Tablet vor Ort', 90, FALSE)
ON CONFLICT (component_type, slug) DO NOTHING;

-- Seed: utm_sources (Digital, Fachportale, Offline, Messen)
INSERT INTO utm_sources (slug, label, category, default_medium, allowed_mediums, shortlink_path)
VALUES
    ('google', 'Google', 'digital', 'cpc', ARRAY['cpc', 'display'], NULL),
    ('linkedin', 'LinkedIn', 'digital', 'paid_social', ARRAY['paid_social', 'organic_social'], NULL),
    ('{{site_source_name}}', 'Meta Ads dynamisch (fb / ig)', 'digital', 'paid_social', ARRAY['paid_social'], NULL),
    ('meta', 'Meta (Organic / statisch)', 'digital', 'organic_social', ARRAY['organic_social'], NULL),
    ('tiktok', 'TikTok', 'digital', 'paid_social', ARRAY['paid_social', 'organic_social'], NULL),
    ('cleverreach', 'CleverReach', 'digital', 'email', ARRAY['email'], NULL),
    ('aerzteblatt', 'Deutsches Ärzteblatt', 'publisher', 'advertorial', ARRAY['advertorial', 'display', 'email'], NULL),
    ('coliquio', 'coliquio', 'publisher', 'advertorial', ARRAY['advertorial', 'display', 'email'], NULL),
    ('medical-tribune', 'Medical Tribune', 'publisher', 'advertorial', ARRAY['advertorial', 'display'], NULL),
    ('kbv', 'KBV', 'publisher', 'advertorial', ARRAY['advertorial', 'display', 'referral'], NULL),
    ('print', 'Print / Dialogpost allgemein', 'offline', 'offline', ARRAY['offline'], NULL),
    ('service-partner', 'Service Partner (Generisch / Massenproduktion)', 'offline', 'offline', ARRAY['offline', 'referral'], NULL),
    ('messe-muenchen', 'Messe München', 'event', 'event', ARRAY['event'], NULL),
    ('messe-dusseldorf', 'Messe Düsseldorf', 'event', 'event', ARRAY['event'], NULL),
    ('interbiologica', 'interbiologica', 'event', 'event', ARRAY['event'], NULL),
    ('apontis', 'apontis', 'event', 'event', ARRAY['event'], NULL)
ON CONFLICT (slug) DO UPDATE
SET
    label = EXCLUDED.label,
    default_medium = EXCLUDED.default_medium,
    allowed_mediums = EXCLUDED.allowed_mediums
WHERE utm_sources.slug IN ('{{site_source_name}}', 'meta', 'tiktok');

-- Seed: Service Partner (45 Partner mit offiziellen Tracking-IDs)
INSERT INTO utm_sources (slug, label, category, default_medium, allowed_mediums)
VALUES
    ('al-data', 'al-DATA', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('as-rheinland', 'Arztsysteme Rheinland', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('bauer-medical', 'BAUER medicalsystems GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('nc-neumann', 'Birk Neumann Netzwerk- und Computertechnik', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('comprax', 'Comprax (Zossen)', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('cs-mentz', 'Computerservice & Software Mentz', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('comretix', 'Comretix GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('comservice', 'ComService GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('ddd', 'DDD Durchblick durch Daten Computer-Technik', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('delfs', 'Delfs GmbH & Co. KG', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('digital-symptom', 'Digital Symptom', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('doctago', 'Doctago GbR', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('eifert-ds', 'Eifert DatenSysteme GmbH & Co. KG', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('engel', 'Engel & Engel GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('erhardt-it', 'ERHARDT-IT-Services GmbH & Co. KG', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('fleig-schmieder', 'Fleig Schmieder Datensysteme', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('hms', 'HMS GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('hoenicke', 'Hoenicke Systembetreuung GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('hoppemed', 'HoppeMed Hans-Werner Hoppe', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('ics-as-burgert', 'ICS Arztsysteme Burgert GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('ics', 'ICS GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('intrakom', 'Intrakom GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('it-sh-jerg', 'IT-Systemhaus Jerg GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('itl-sh', 'ITL Systemhaus/Linhardt', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('kobus-datentechnik', 'Kobus Datentechnik', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('lachnit-edv', 'Lachnit EDV Service', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('lcs', 'LCS GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('m-its', 'M•ITS', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('medical-future', 'medical future GmbH (Leipzig)', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('medip-it', 'medipIT (Willich)', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('medis', 'MEDIS Med. Informations Systeme GbR (Rostock)', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('mednext', 'medNEXT GmbH (Neuötting)', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('metis', 'Metis GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('opitz-computer', 'Opitz Computertechnik Vertrieb', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('piwinger-lau', 'Piwinger & Lau GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('reichle', 'Reichle GmbH Ravensburg', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('richtersystem', 'RICHTERSYSTEM GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('starke-reichert', 'Starke + Reichert', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('support-four-it', 'Support-4-IT GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('sh-bergholz', 'Systemhaus Bergholz GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('tbs-computer', 'tbs Computer-Systeme GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('topas', 'Topas', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('varicom', 'VariCom EDV Systeme GmbH', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('werremeyer-edv', 'WERRMEYER EDV Dienstleistungen', 'partner', 'offline', ARRAY['offline', 'referral', 'event']),
    ('woinke', 'Informationstechnik Woinke', 'partner', 'offline', ARRAY['offline', 'referral', 'event'])
ON CONFLICT (slug) DO NOTHING;

-- Seed: Standorte (Niederlassungen & Zentralen)
INSERT INTO utm_sources (slug, label, category, default_medium, allowed_mediums)
VALUES
    ('nl-nord', 'medatixx-Niederlassung Nord', 'location', 'offline', ARRAY['offline', 'event', 'referral']),
    ('nl-ost', 'medatixx-Niederlassung Ost', 'location', 'offline', ARRAY['offline', 'event', 'referral']),
    ('nl-sued', 'medatixx-Niederlassung Süd', 'location', 'offline', ARRAY['offline', 'event', 'referral']),
    ('nl-west', 'medatixx-Niederlassung West', 'location', 'offline', ARRAY['offline', 'event', 'referral']),
    ('z-ba', 'medatixx GmbH (Zentrale/Region Bamberg)', 'location', 'offline', ARRAY['offline', 'event', 'referral']),
    ('z-elt', 'medatixx GmbH (Zentrale/Region Eltville)', 'location', 'offline', ARRAY['offline', 'event', 'referral'])
ON CONFLICT (slug) DO NOTHING;
