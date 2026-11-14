import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './components/Login';
import UTMBuilder from './components/UTMBuilder';
import CampaignLibrary from './components/CampaignLibrary';
import SavedLinks from './components/SavedLinks';
import TaxonomyManager from './components/TaxonomyManager';
import Admin from './components/Admin';
import './App.css';

const App = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [campaigns, setCampaigns] = useState([]);
  const [sources, setSources] = useState([]);
  const [components, setComponents] = useState([]);
  const [savedLinks, setSavedLinks] = useState([]);
  const [dataError, setDataError] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      try {
        const res = await fetch('/api/users/validate-token', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setUser({ name: data.name, role: data.role });
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    validateToken();
  }, []);

  useEffect(() => {
    if (!user) return;

    const loadAppData = async () => {
      try {
        setDataError('');
        const [campaignsRes, taxonomyRes, linksRes] = await Promise.all([
          fetch('/api/campaigns', { credentials: 'include' }),
          fetch('/api/taxonomy', { credentials: 'include' }),
          fetch('/api/links', { credentials: 'include' }),
        ]);

        if (campaignsRes.ok) {
          const cData = await campaignsRes.json();
          setCampaigns(Array.isArray(cData) ? cData : cData?.rows || []);
        }

        if (taxonomyRes.ok) {
          const tData = await taxonomyRes.json();
          setSources(Array.isArray(tData?.sources) ? tData.sources : []);
          setComponents(Array.isArray(tData?.components) ? tData.components : []);
        } else {
          setDataError('Taxonomie-Daten konnten nicht geladen werden. Bitte prüfen, ob database_schema.sql in Neon ausgeführt wurde.');
        }

        if (linksRes.ok) {
          const lData = await linksRes.json();
          setSavedLinks(Array.isArray(lData) ? lData : lData?.rows || []);
        }
      } catch (e) {
        console.error('Daten laden fehlgeschlagen:', e.message);
        setDataError('Verbindung zur Datenbank fehlgeschlagen.');
      }
    };

    loadAppData();
  }, [user]);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = async () => {
    try {
      await fetch('/api/users/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout-Fehler:', e);
    }
    setUser(null);
    setCampaigns([]);
    setSources([]);
    setComponents([]);
    setSavedLinks([]);
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Lädt...</div>;
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      {dataError && (
        <div className="bg-red-900/80 border-b border-red-600 text-red-100 text-sm text-center py-2 px-4">
          {dataError}
        </div>
      )}
      <Routes>
        <Route
          path="/"
          element={
            <UTMBuilder
              campaigns={campaigns}
              sources={sources}
              components={components}
              onSourceCreated={(newSource) => setSources((prev) => [...prev, newSource])}
              onLinkSaved={(newLink) => setSavedLinks((prev) => [newLink, ...prev])}
              user={user}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/links"
          element={
            <SavedLinks
              links={savedLinks}
              setLinks={setSavedLinks}
              user={user}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/library"
          element={
            <CampaignLibrary
              campaigns={campaigns}
              setCampaigns={setCampaigns}
              components={components}
              user={user}
              onLogout={handleLogout}
            />
          }
        />
        <Route
          path="/manage"
          element={
            <TaxonomyManager
              sources={sources}
              setSources={setSources}
              components={components}
              setComponents={setComponents}
              user={user}
              onLogout={handleLogout}
            />
          }
        />
        {user.role === 'admin' && (
          <Route path="/admin" element={<Admin user={user} onLogout={handleLogout} />} />
        )}
      </Routes>
    </Router>
  );
};

export default App;
