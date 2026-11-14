import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UTMBuilder from './UTMBuilder';

const mockSources = [
  {
    slug: 'google',
    label: 'Google',
    category: 'digital',
    default_medium: 'cpc',
    allowed_mediums: ['cpc', 'display'],
    is_active: true,
  },
  {
    slug: '{{site_source_name}}',
    label: 'Meta (Dynamic fb / ig)',
    category: 'digital',
    default_medium: 'paid_social',
    allowed_mediums: ['paid_social'],
    is_active: true,
  },
  {
    slug: 'tiktok',
    label: 'TikTok',
    category: 'digital',
    default_medium: 'paid_social',
    allowed_mediums: ['paid_social', 'organic_social'],
    is_active: true,
  },
  {
    slug: 'print',
    label: 'Print / Dialogpost',
    category: 'offline',
    default_medium: 'offline',
    allowed_mediums: ['offline'],
    is_active: true,
  },
  {
    slug: 'aerzteblatt',
    label: 'Deutsches Ärzteblatt',
    category: 'publisher',
    default_medium: 'advertorial',
    allowed_mediums: ['advertorial', 'display', 'email'],
    is_active: true,
  },
  {
    slug: 'al-data',
    label: 'al-DATA',
    category: 'partner',
    default_medium: 'offline',
    allowed_mediums: ['offline', 'referral'],
    is_active: true,
  },
  {
    slug: 'bauer-medical',
    label: 'BAUER medicalsystems GmbH',
    category: 'partner',
    default_medium: 'offline',
    allowed_mediums: ['offline', 'referral'],
    is_active: true,
  },
  {
    slug: 'nl-nord',
    label: 'medatixx-Niederlassung Nord',
    category: 'location',
    default_medium: 'offline',
    allowed_mediums: ['offline', 'event'],
    is_active: true,
  },
  {
    slug: 'messe-muenchen',
    label: 'Messe München',
    category: 'event',
    default_medium: 'event',
    allowed_mediums: ['event'],
    is_active: true,
  },
];

const mockComponents = [
  { component_type: 'medium', slug: 'cpc', description: 'Search / SEA', is_active: true },
  { component_type: 'medium', slug: 'paid_social', description: 'Paid Social', is_active: true },
  { component_type: 'medium', slug: 'organic_social', description: 'Organic Social', is_active: true },
  { component_type: 'medium', slug: 'display', description: 'Display', is_active: true },
  { component_type: 'medium', slug: 'advertorial', description: 'Advertorial', is_active: true },
  { component_type: 'medium', slug: 'email', description: 'Email', is_active: true },
  { component_type: 'medium', slug: 'offline', description: 'Print / Rollups', is_active: true },
  { component_type: 'medium', slug: 'event', description: 'Messe', is_active: true },
  { component_type: 'medium', slug: 'referral', description: 'Referral', is_active: true },
  { component_type: 'topic', slug: 'healthhub', description: 'HealthHub', is_active: true },
  { component_type: 'topic', slug: 'zukunft-endspurt', description: 'Zukunft Endspurt', is_active: true },
  { component_type: 'audience', slug: 'aerzte-allg', description: 'Ärzte allgemein', is_active: true },
  { component_type: 'funnel', slug: 'mofu', description: 'Middle of Funnel', is_active: true },
];

afterEach(() => {
  jest.resetAllMocks();
});

test('wählt zuerst UTM Medium und filtert anschließend alle erlaubten UTM Sources und Kategorien', () => {
  render(
    <MemoryRouter>
      <UTMBuilder
        campaigns={[]}
        sources={mockSources}
        components={mockComponents}
        user={{ name: 'tester', role: 'standard' }}
        onLogout={() => {}}
      />
    </MemoryRouter>
  );

  // Zu Beginn ist UTM Source gesperrt, bis ein Medium gewählt wurde
  const mediumSelect = screen.getByLabelText('UTM Medium');
  expect(mediumSelect).not.toBeDisabled();
  expect(screen.getByLabelText('UTM Source')).toBeDisabled();

  // Medium "paid_social" wählen -> {{site_source_name}} und tiktok erscheinen, google/print nicht
  fireEvent.change(mediumSelect, { target: { value: 'paid_social' } });
  const sourceSelect = screen.getByLabelText('UTM Source');
  expect(sourceSelect).not.toBeDisabled();
  expect(screen.getByText(/\{\{site_source_name\}\} — Meta \(Dynamic fb \/ ig\)/i)).toBeInTheDocument();
  expect(screen.getByText(/tiktok — TikTok/i)).toBeInTheDocument();
  expect(screen.queryByText(/google — Google/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/print — Print \/ Dialogpost/i)).not.toBeInTheDocument();

  // Medium auf "offline" wechseln -> Standard (print), Partner (2) und Standort (1) sind aktiv; Messe (0) deaktiviert
  fireEvent.change(mediumSelect, { target: { value: 'offline' } });
  expect(screen.getByText(/print — Print \/ Dialogpost/i)).toBeInTheDocument();
  expect(screen.queryByText(/tiktok — TikTok/i)).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Messe \/ Event \(0\)/i })).toBeDisabled();

  // Klick auf Service-Partner öffnet die für offline erlaubte Partner-Liste
  fireEvent.click(screen.getByRole('button', { name: /Service-Partner \(2\)/i }));
  expect(screen.getByText(/al-DATA \(al-data\)/i)).toBeInTheDocument();
  expect(screen.getByText(/BAUER medicalsystems GmbH \(bauer-medical\)/i)).toBeInTheDocument();

  // Suchfilter grenzt Partner-Liste ein
  fireEvent.change(screen.getByPlaceholderText(/Partner suchen/i), { target: { value: 'bauer' } });
  expect(screen.queryByText(/al-DATA \(al-data\)/i)).not.toBeInTheDocument();
  expect(screen.getByText(/BAUER medicalsystems GmbH \(bauer-medical\)/i)).toBeInTheDocument();

  // Klick auf Standort / NL öffnet die Standorte
  fireEvent.click(screen.getByRole('button', { name: /Standort \/ NL \(1\)/i }));
  expect(screen.getByText(/medatixx-Niederlassung Nord \(nl-nord\)/i)).toBeInTheDocument();
});

test('wechselt bei advertorial auf Fachportale/Publisher und speichert neuen Publisher beim Link speichern in Neon', async () => {
  const onSourceCreated = jest.fn();
  const onLinkSaved = jest.fn();

  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          link: { id: 101, utm_source: 'aerzte-zeitung', utm_medium: 'advertorial' },
          createdSource: {
            id: 55,
            slug: 'aerzte-zeitung',
            label: 'Ärzte Zeitung',
            category: 'publisher',
            default_medium: 'advertorial',
            allowed_mediums: ['advertorial', 'display', 'email'],
            is_active: true,
          },
        }),
    })
  );

  render(
    <MemoryRouter>
      <UTMBuilder
        campaigns={[]}
        sources={mockSources}
        components={mockComponents}
        onSourceCreated={onSourceCreated}
        onLinkSaved={onLinkSaved}
        user={{ name: 'tester', role: 'standard' }}
        onLogout={() => {}}
      />
    </MemoryRouter>
  );

  // Zuerst Medium "advertorial" wählen -> Builder springt automatisch in den Publisher-Modus
  const mediumSelect = screen.getByLabelText('UTM Medium');
  fireEvent.change(mediumSelect, { target: { value: 'advertorial' } });

  const pubSelect = screen.getByLabelText('Fachportale / Publisher');
  const options = Array.from(pubSelect.querySelectorAll('option')).map((o) => o.value);
  expect(options[1]).toBe('__new_publisher');

  // "+ Neuer Publisher" wählen
  fireEvent.change(pubSelect, { target: { value: '__new_publisher' } });

  // Ungültigen Namen eingeben -> Naming-Convention-Check schlägt an
  const slugInput = screen.getByPlaceholderText(/z\. B\. aerzte-zeitung/i);
  fireEvent.change(slugInput, { target: { value: 'Ärzte Zeitung' } });
  expect(screen.getByText(/muss komplett kleingeschrieben sein/i)).toBeInTheDocument();

  // Übernehmen-Button korrigiert auf gültigen Slug
  fireEvent.click(screen.getByRole('button', { name: /Übernehmen: aerzte-zeitung/i }));
  expect(slugInput.value).toBe('aerzte-zeitung');

  // Anzeigename ergänzen und Campaign-Module wählen
  fireEvent.change(screen.getByPlaceholderText(/z\. B\. Ärzte Zeitung/i), {
    target: { value: 'Ärzte Zeitung' },
  });

  const selects = screen.getAllByRole('combobox');
  fireEvent.change(selects.find((s) => s.innerHTML.includes('zukunft-endspurt')), {
    target: { value: 'zukunft-endspurt' },
  });
  fireEvent.change(selects.find((s) => s.innerHTML.includes('aerzte-allg')), {
    target: { value: 'aerzte-allg' },
  });
  fireEvent.change(selects.find((s) => s.innerHTML.includes('mofu')), {
    target: { value: 'mofu' },
  });

  // Link speichern klicken
  const saveButton = screen.getByRole('button', { name: /Link speichern/i });
  fireEvent.click(saveButton);

  await waitFor(() => {
    expect(onSourceCreated).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'aerzte-zeitung', category: 'publisher' })
    );
  });
  expect(onLinkSaved).toHaveBeenCalled();
  expect(global.fetch).toHaveBeenCalledWith(
    '/api/links',
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"new_publisher":{"slug":"aerzte-zeitung","label":"Ärzte Zeitung"}'),
    })
  );
});

test('entfernt Looker Studio Check und TYPO3 Shortlink, ermöglicht Theme-Wechsel und Thema-Anlage nur für Admins', async () => {
  window.localStorage.clear();

  // Standard-User sieht kein "Thema anlegen (Admin)", keinen Looker Studio Check und keinen TYPO3 Shortlink
  const { unmount } = render(
    <MemoryRouter>
      <UTMBuilder
        campaigns={[]}
        sources={mockSources}
        components={mockComponents}
        user={{ name: 'tester', role: 'standard' }}
        onLogout={() => {}}
      />
    </MemoryRouter>
  );

  expect(screen.queryByText(/Looker Studio & GA4 Check-Vorschau/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/TYPO3 Shortlink/i)).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Thema anlegen/i })).not.toBeInTheDocument();

  // Bright Theme umschalten
  const themeBtn = screen.getByRole('button', { name: /Zum Bright Theme wechseln/i });
  fireEvent.click(themeBtn);
  expect(document.documentElement.getAttribute('data-theme')).toBe('light');

  unmount();

  // Admin kann direkt ein neues Thema anlegen
  const onComponentCreated = jest.fn();
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          id: 99,
          component_type: 'topic',
          slug: 'neues-thema-2027',
          label: 'neues-thema-2027',
          description: 'Neues Thema 2027',
          is_active: true,
        }),
    })
  );

  render(
    <MemoryRouter>
      <UTMBuilder
        campaigns={[]}
        sources={mockSources}
        components={mockComponents}
        onComponentCreated={onComponentCreated}
        user={{ name: 'admin', role: 'admin' }}
        onLogout={() => {}}
      />
    </MemoryRouter>
  );

  fireEvent.click(screen.getByRole('button', { name: /Thema anlegen \(Admin\)/i }));
  fireEvent.change(screen.getByPlaceholderText(/z\. B\. Regulatorik 2027/i), {
    target: { value: 'Neues Thema 2027' },
  });
  fireEvent.click(screen.getByRole('button', { name: /Thema in Neon speichern/i }));

  await waitFor(() => {
    expect(onComponentCreated).toHaveBeenCalledWith(
      expect.objectContaining({ component_type: 'topic', slug: 'neues-thema-2027' })
    );
  });

  expect(global.fetch).toHaveBeenCalledWith(
    '/api/taxonomy',
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"component_type":"topic"'),
    })
  );
});
