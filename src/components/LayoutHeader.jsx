import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogOut, Menu, X, Link2, Layers, Database, Shield, Wrench } from 'lucide-react';

const LayoutHeader = ({ title, user, onLogout }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

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
      <header className="bg-[var(--card-background)] border-b border-[var(--border-color)] p-4">
        <div className="container flex justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <Link to="/" className="text-xl md:text-2xl font-bold text-[var(--text-color)] hover:text-[var(--primary-color)] transition-colors">
              {title}
            </Link>
            <nav className="hidden lg:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'bg-[var(--primary-color)] text-white'
                        : 'text-[var(--accent-color)] hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs md:text-sm text-[var(--accent-color)]">
              {user.name} ({user.role})
            </span>
            <button onClick={onLogout} className="icon text-red-400 hover:text-red-300" title="Abmelden">
              <LogOut size={18} />
            </button>
            <button onClick={() => setMenuOpen(!menuOpen)} className="icon lg:hidden" title="Menü">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </header>

      <div className={`menu ${menuOpen ? 'menu-open' : ''}`}>
        <button onClick={() => setMenuOpen(false)} className="icon absolute top-4 right-4">
          <X size={24} />
        </button>
        <div className="mt-12">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className="menu-item"
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={() => {
              setMenuOpen(false);
              onLogout();
            }}
            className="menu-item text-left text-red-400 w-full mt-4 flex items-center gap-2"
          >
            <LogOut size={18} /> Abmelden
          </button>
        </div>
      </div>
    </>
  );
};

export default LayoutHeader;
