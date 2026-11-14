# medxx-utm-tool

UTM Parameter Generator, Link-Historie & Kampagnen-Management für das medatixx Marketing-Team.

## Features

- **Modularer UTM Parameter Builder (`/`)**: Dropdown-geführtes Zusammenstellen von `utm_medium`, `utm_source`, `utm_campaign` (`[Thema]_[Zielgruppe]_[Funnel]`), `utm_content` (`[Angle]_[Format]`) und `utm_term` inkl. Live-Check und Looker-Studio-Split-Vorschau.
- **Gespeicherte Links (`/links`)**: Speichern aller generierten UTM-URLs in Neon (`saved_links`) inklusive optionaler Notiz und TYPO3-Shortlink-Dokumentation, Suche, Filter und Kopierfunktion.
- **Kampagnen-Bibliothek (`/library`)**: Modulare Verwaltung wiederkehrender Kampagnen (`[Thema]_[Zielgruppe]_[Funnel]`).
- **Partner-, Messen- & Katalogverwaltung (`/manage`)**:
  - Standard-Nutzer können neue **Partner** (`partner-[name]`) und **Messen/Events** (`messe-[stadt]`) in Neon anlegen.
  - Admins verwalten zusätzlich alle weiteren Sources, Themen, Zielgruppen, Angles und Formate (`utm_medium` und `Funnel` sind geschützte GA4-Standards).
- **Benutzerverwaltung & Sicherheit (`/admin`)**: Rollenbasierter Zugriff (`admin` und `standard`) über JWT-Cookies (HttpOnly, SameSite) und Admin-Passwort.

## Umgebungsvariablen (Environment Variables)

Für den Betrieb (lokal in `.env` oder in den Vercel Project Settings) werden folgende Variablen benötigt:

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge (z. B. von Neon) |
| `JWT_SECRET` | Geheimer Schlüssel zur Signierung der JWT-Auth-Cookies (ohne Fallback) |
| `APP_PASSWORD` | Team-/Unternehmenspasswort für den Login aller autorisierten Nutzer |
| `ADMIN_PASSWORD` | Admin-Passwort für die Nutzerverwaltung |

## Datenbank einrichten

Führen Sie die Befehle aus `database_schema.sql` im SQL-Editor Ihrer Neon- oder Postgres-Datenbank aus, um die Tabellen `users`, `campaigns`, `utm_sources`, `utm_components` und `saved_links` inkl. Start-Katalog anzulegen.

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm start
```
