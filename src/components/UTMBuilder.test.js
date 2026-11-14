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
  { component_type: 'medium', slug: 'display', description: 'Display', is_active: true },
  { component_type: 'medium', slug: 'advertorial', description: 'Advertorial', is_active: true },
  { component_type: 'medium', slug: 'email', description: 'Email', is_active: true },
  { component_type: 'medium', slug: 'offline', description: 'Print / Rollups', is_active: true },
  { component_type: 'medium', slug: 'event', description: 'Messe', is_active: true },
  { component_type: 'medium', slug: 'referral', description: 'Referral', is_active: true },
  { component_type: 'topic', slug: 'healthhub', description: 'HealthHub', is_active: true },
  { component_type: 'audience', slug: 'aerzte-allg', description: 'Ärzte allgemein', is_active: true },
  { component_type: 'funnel', slug: 'mofu', description: 'Middle of Funnel', is_active: true },
];

afterEach(() => {
  jest.resetAllMocks();
});

test('trennt Standard-Sources von Publisher-, Partner-, Standort- und Messe-Listen', () => {
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

  // Im Standard-Modus sind keine Partner- oder Publisher-Slugs direkt im Source-Dropdown
  expect(screen.getByText(/google — Google/i)).toBeInTheDocument();
  expect(screen.queryByText(/al-DATA \(al-data\)/i)).not.toBeInTheDocument();
  expect(screen.queryByText(/Deutsches Ärzteblatt \(aerzteblatt\)/i)).not.toBeInTheDocument();

  // Klick auf Service-Partner öffnet die Partner-Liste
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

test('filtert UTM Medium streng nach den erlaubten Parametern der gewählten Source', () => {
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

  const mediumSelect = screen.getByLabelText('UTM Medium');
  expect(mediumSelect).toBeDisabled();

  // Source "google" wählen -> nur cpc und display erlaubt
  const sourceSelect = screen.getByLabelText('UTM Source');
  fireEvent.change(sourceSelect, { target: { value: 'google' } });

  expect(mediumSelect).not.toBeDisabled();
  expect(mediumSelect.value).toBe('cpc');

  const optionValues = Array.from(mediumSelect.querySelectorAll('option')).map((o) => o.value);
  expect(optionValues).toEqual(['', 'cpc', 'display']);
});

test('ermöglicht "Neuer Publisher" im Fachportale-Dropdown und speichert ihn beim Link speichern in Neon', async () => {
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
            allowed_mediums: ['advertorial', 'display', 'email', 'referral'],
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

  // Fachportale / Publisher Tab öffnen
  fireEvent.click(screen.getByRole('button', { name: /Fachportale \/ Publisher \(1\)/i }));

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
  // Thema, Zielgruppe, Funnel setzen
  fireEvent.change(selects.find((s) => s.innerHTML.includes('healthhub')), { target: { value: 'healthhub' } });
  fireEvent.change(selects.find((s) => s.innerHTML.includes('aerzte-allg')), { target: { value: 'aerzte-allg' } });
  fireEvent.change(selects.find((s) => s.innerHTML.includes('mofu')), { target: { value: 'mofu' } });

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
