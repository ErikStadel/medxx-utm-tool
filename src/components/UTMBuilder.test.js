import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import UTMBuilder from './UTMBuilder';

const mockSources = [
  { slug: 'google', label: 'Google', category: 'digital', default_medium: 'cpc', allowed_mediums: ['cpc'], is_active: true },
  { slug: 'print', label: 'Print / Dialogpost', category: 'offline', default_medium: 'offline', allowed_mediums: ['offline'], is_active: true },
  { slug: 'al-data', label: 'al-DATA', category: 'partner', default_medium: 'offline', allowed_mediums: ['offline'], is_active: true },
  { slug: 'bauer-medical', label: 'BAUER medicalsystems GmbH', category: 'partner', default_medium: 'offline', allowed_mediums: ['offline'], is_active: true },
  { slug: 'nl-nord', label: 'medatixx-Niederlassung Nord', category: 'location', default_medium: 'offline', allowed_mediums: ['offline'], is_active: true },
  { slug: 'messe-muenchen', label: 'Messe München', category: 'event', default_medium: 'event', allowed_mediums: ['event'], is_active: true },
];

const mockComponents = [
  { component_type: 'medium', slug: 'offline', description: 'Print / Rollups', is_active: true },
  { component_type: 'topic', slug: 'healthhub', description: 'HealthHub', is_active: true },
  { component_type: 'audience', slug: 'aerzte-allg', description: 'Ärzte allgemein', is_active: true },
  { component_type: 'funnel', slug: 'mofu', description: 'Middle of Funnel', is_active: true },
];

test('trennt Standard-Sources von Partner-, Standort- und Messe-Listen', () => {
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

  // Im Standard-Modus sind keine Partner-Slugs direkt sichtbar
  expect(screen.getByText(/google — Google/i)).toBeInTheDocument();
  expect(screen.queryByText(/al-DATA \(al-data\)/i)).not.toBeInTheDocument();

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
