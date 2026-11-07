# medxx-utm-tool

UTM Parameter Generator & Kampagnen-Management für Marketing-Teams.

## Features

- **UTM Parameter Builder**: Schnelles und einheitliches Erstellen von UTM-Tracking-URLs für diverse Marketing-Kanäle (Google Ads, Bing Ads, Facebook Ads, TikTok Ads, Email, Social Organic, Affiliate etc.).
- **Kampagnen-Bibliothek**: Speichern, Validieren, Verwalten und Wiederverwenden von Kampagnen-Parametern.
- **Benutzerverwaltung & Sicherheit**: Rollenbasierter Zugriff (`admin` und `standard`) geschützt über Benutzername + Passwort, JWT-Cookies (HttpOnly, SameSite) und Admin-Berechtigung.

## Umgebungsvariablen (Environment Variables)

Für den Betrieb (lokal in `.env` oder in den Vercel Project Settings) werden folgende Variablen benötigt:

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge (z. B. von Neon) |
| `JWT_SECRET` | Geheimer Schlüssel zur Signierung der JWT-Auth-Cookies (ohne Fallback) |
| `APP_PASSWORD` | Team-/Unternehmenspasswort für den Login aller autorisierten Nutzer |
| `ADMIN_PASSWORD` | Admin-Passwort für die Nutzerverwaltung |

## Datenbank einrichten

Führen Sie die Befehle aus `database_schema.sql` im SQL-Editor Ihrer Neon- oder Postgres-Datenbank aus, um die Tabellen `users` und `campaigns` anzulegen.

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm start
```
