# medxx-utm-tool

UTM Parameter Generator & Kampagnen-Management für Marketing-Teams.

## Features

- **UTM Parameter Builder**: Schnelles und einheitliches Erstellen von UTM-Tracking-URLs für diverse Marketing-Kanäle (Google Ads, Bing Ads, Facebook Ads, TikTok Ads, Email, Social Organic, Affiliate etc.).
- **Kampagnen-Bibliothek**: Speichern, Verwalten und Wiederverwenden von Kampagnen-Parametern.
- **Lizenzen / UTM-Schreibweisen**: Zentrale Verwaltung von Lizenzen und Namenskonventionen inklusive Such- und Vorschlagsfunktion.
- **Benutzerverwaltung**: Rollenbasierter Zugriff (`admin` und `standard`) geschützt über JWT-Tokens und Admin-Passwort.

## Tech-Stack

- **Frontend**: React 18, React Router, Tailwind CSS, Lucide Icons
- **Backend / API**: Vercel Serverless Functions (`/api/*`)
- **Datenbank**: PostgreSQL (optimiert für Neon Serverless via `@neondatabase/serverless`)
- **Authentifizierung**: JWT (HTTP-Only Cookie) & Admin Header-Passwort

## Umgebungsvariablen (Environment Variables)

Für den Betrieb (lokal in `.env` oder in den Vercel Project Settings) werden folgende Variablen benötigt:

| Variable | Beschreibung |
|---|---|
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge (z. B. von Neon) |
| `JWT_SECRET` | Geheimer Schlüssel zur Signierung der JWT-Auth-Cookies |
| `ADMIN_PASSWORD` | Passwort für administrative Aktionen (z. B. Nutzerverwaltung) |

## Datenbank einrichten

Führen Sie die Befehle aus `database_schema.sql` im SQL-Editor Ihrer Neon- oder Postgres-Datenbank aus, um die Tabellen `users`, `campaigns` und `licenses` anzulegen.

## Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm start
```
