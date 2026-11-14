import { render, screen, waitFor } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Not authenticated' }),
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

test('zeigt Login-Ansicht wenn kein gültiges Token vorliegt', async () => {
  render(<App />);
  await waitFor(() => {
    expect(screen.getByText(/medxx-utm-tool/i)).toBeInTheDocument();
  });
  expect(screen.getByRole('button', { name: /Anmelden/i })).toBeInTheDocument();
});
