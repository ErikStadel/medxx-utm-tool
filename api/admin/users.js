import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Serverkonfigurationsfehler: JWT_SECRET fehlt' });
    }
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: 'Serverkonfigurationsfehler: DATABASE_URL fehlt' });
    }
    if (!process.env.ADMIN_PASSWORD) {
      return res.status(500).json({ error: 'Serverkonfigurationsfehler: ADMIN_PASSWORD fehlt' });
    }

    // Authentifizierung
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.userToken;
    if (!token) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    let user;
    try {
      user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Ungültiges Token' });
    }

    // Admin-Prüfung
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Nur Admins dürfen auf diesen Bereich zugreifen' });
    }

    // Passwort-Prüfung
    const providedPassword = req.headers['x-admin-password'];
    if (!providedPassword || providedPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(403).json({ error: 'Ungültiges Admin-Passwort' });
    }

    const sql = neon(process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const result = await sql`SELECT id, name, role FROM users ORDER BY name;`;
      const rows = Array.isArray(result) ? result : result.rows || [];
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, role, password } = req.body || {};
      if (!name || !role || !['admin', 'standard'].includes(role)) {
        return res.status(400).json({ error: 'Name und gültige Rolle (admin/standard) erforderlich' });
      }

      const userPassword = password && password.trim() !== '' ? password.trim() : null;

      const result = await sql`
        INSERT INTO users (name, role, password)
        VALUES (${name.trim().toLowerCase()}, ${role}, ${userPassword})
        ON CONFLICT (name) DO NOTHING
        RETURNING id, name, role;
      `;
      const rows = Array.isArray(result) ? result : result.rows || [];
      if (rows.length === 0) {
        return res.status(400).json({ error: 'Nutzer existiert bereits' });
      }
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const { id, name, role, password } = req.body || {};
      if (!id || !name || !role || !['admin', 'standard'].includes(role)) {
        return res.status(400).json({ error: 'ID, Name und gültige Rolle (admin/standard) erforderlich' });
      }

      let result;
      if (password && password.trim() !== '') {
        result = await sql`
          UPDATE users
          SET name = ${name.trim().toLowerCase()}, role = ${role}, password = ${password.trim()}
          WHERE id = ${id}
          RETURNING id, name, role;
        `;
      } else {
        result = await sql`
          UPDATE users
          SET name = ${name.trim().toLowerCase()}, role = ${role}
          WHERE id = ${id}
          RETURNING id, name, role;
        `;
      }

      const rows = Array.isArray(result) ? result : result.rows || [];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Nutzer nicht gefunden' });
      }
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID erforderlich' });
      }
      const result = await sql`DELETE FROM users WHERE id = ${id} RETURNING id;`;
      const rows = Array.isArray(result) ? result : result.rows || [];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Nutzer nicht gefunden' });
      }
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Fehler in admin/users handler:', error.message);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
