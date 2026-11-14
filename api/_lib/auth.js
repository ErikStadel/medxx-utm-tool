import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

/**
 * Authentifiziert eine API-Anfrage über das userToken-Cookie und stellt die Neon-SQL-Instanz bereit.
 * Sendet bei Fehlern direkt die passende HTTP-Antwort und gibt null zurück.
 */
export async function requireAuth(req, res) {
  if (!process.env.JWT_SECRET) {
    res.status(500).json({ error: 'Serverkonfigurationsfehler: JWT_SECRET fehlt' });
    return null;
  }

  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!dbUrl) {
    res.status(500).json({ error: 'Serverkonfigurationsfehler: DATABASE_URL / POSTGRES_URL fehlt' });
    return null;
  }

  const cookies = parse(req.headers.cookie || '');
  const token = cookies.userToken;
  if (!token) {
    res.status(401).json({ error: 'Nicht authentifiziert' });
    return null;
  }

  let user;
  try {
    user = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401).json({ error: 'Ungültiges Token' });
    return null;
  }

  const sql = neon(dbUrl);
  return { sql, user };
}
