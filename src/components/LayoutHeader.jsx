import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LogOut,
  Menu,
  X,
  Link2,
  Layers,
  Database,
  Shield,
  Wrench,
  Sun,
  Moon,
} from 'lucide-react';
import { applyTheme, getInitialTheme } from '../utils/theme';

const LayoutHeader = ({ title, user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => getInitialTheme());
  const location = useLocation();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const navItems = [
    { to: '/', label: 'UTM Builder', icon: Wrench },
    { to: '/links', label: 'Gespeicherte Links', icon: Link2 },
    { to: '/library', label: 'Kampagnen-Bibliothek', icon: Layers },
    { to: '/manage', label: 'Partner, Messen & Katalog', icon: Database },
  ];

  if (user?.role === 'admin') {
    navItems.push({ to: '/admin', label: 'Admin: Nutzer', icon: Shield });
  }

  return (
    <>
      <header className="bg-[var(--card-background)] border-b border-[var(--border-color)] py-3.5 px-4 transition-colors">
        <div className="container flex justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="text-lg sm:text-xl font-bold text-[var(--text-color)] hover:text-[var(--primary-color)] transition-colors whitespace-nowrap"
            >
              {title}
            </Link>
            <nav className="hidden lg:flex items-center gap-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-[var(--primary-color)] text-white shadow-sm'
                        : 'text-[var(--accent-color)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-color)]'
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="hidden sm:inline text-xs md:text-sm text-[var(--text-muted)]">
              {user.name} ({user.role})
            </span>
            <button
              type="button"
              onClick={toggleTheme}
              className="icon flex items-center gap-1.5 text-xs px-2.5 py-1.5"
              title={theme === 'dark' ? 'Zum Bright Theme wechseln' : 'Zum Dark Theme wechseln'}
              aria-label={theme === 'dark' ? 'Zum Bright Theme wechseln' : 'Zum Dark Theme wechseln'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
              <span className="hidden md:inline">{theme === 'dark' ? 'Bright' : 'Dark'}</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="danger icon"
              title="Abmelden"
              aria-label="Abmelden"
            >
              <LogOut size={17} />
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="icon lg:hidden"
              title="Menü"
              aria-label="Menü"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      <div className={`menu ${menuOpen ? 'menu-open' : ''}`}>
        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          className="icon absolute top-4 right-4"
          aria-label="Menü schließen"
        >
          <X size={20} />
        </button>
        <div className="mt-16 px-2 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="menu-item rounded-lg"
            >
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              toggleTheme();
            }}
            className="menu-item rounded-lg text-left w-full flex items-center gap-2"
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            {theme === 'dark' ? 'Bright Theme aktivieren' : 'Dark Theme aktivieren'}
          </button>
          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              onLogout();
            }}
            className="menu-item rounded-lg text-left text-[var(--error-color)] w-full mt-4 flex items-center gap-2"
          >
            <LogOut size={17} /> Abmelden
          </button>
        </div>
      </div>
    </>
  );
};

export default LayoutHeader;
