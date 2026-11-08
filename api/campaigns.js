import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Serverkonfigurationsfehler: JWT_SECRET fehlt' });
    }
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: 'Serverkonfigurationsfehler: DATABASE_URL / POSTGRES_URL fehlt' });
    }

    // Authentifizierung
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.userToken;
    if (!token) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }

    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Ungültiges Token' });
    }

    const sql = neon(dbUrl);

    if (req.method === 'GET') {
      let result;
      if (req.user.role === 'admin') {
        result = await sql`SELECT * FROM campaigns ORDER BY id DESC;`;
      } else {
        result = await sql`
          SELECT * FROM campaigns 
          WHERE inhaber = ${req.user.name} OR inhaber = 'alle' 
          ORDER BY id DESC;
        `;
      }
      const rows = Array.isArray(result) ? result : result.rows || [];
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { name, category, inhaber: providedInhaber } = req.body || {};
      if (!name || !category) {
        return res.status(400).json({ error: 'Name und Kategorie erforderlich' });
      }
      const finalInhaber = (req.user.role === 'admin' && providedInhaber === 'alle') ? 'alle' : req.user.name;
      const result = await sql`
        INSERT INTO campaigns (name, category, archived, inhaber)
        VALUES (${name.trim()}, ${category.trim()}, FALSE, ${finalInhaber})
        RETURNING *;
      `;
      const rows = Array.isArray(result) ? result : result.rows || [];
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const { id, name, category, archived, inhaber: providedInhaber } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID erforderlich' });
      }

      let result;
      if (req.user.role === 'admin') {
        const finalInhaber = providedInhaber || req.user.name;
        result = await sql`
          UPDATE campaigns
          SET name = ${name}, category = ${category}, archived = ${archived}, inhaber = ${finalInhaber}
          WHERE id = ${id}
          RETURNING *;
        `;
      } else {
        // Nicht-Admins dürfen nur eigene Kampagnen bearbeiten
        result = await sql`
          UPDATE campaigns
          SET name = ${name}, category = ${category}, archived = ${archived}, inhaber = ${req.user.name}
          WHERE id = ${id} AND inhaber = ${req.user.name}
          RETURNING *;
        `;
      }

      const rows = Array.isArray(result) ? result : result.rows || [];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Kampagne nicht gefunden oder keine Berechtigung' });
      }
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID erforderlich' });
      }

      let result;
      if (req.user.role === 'admin') {
        result = await sql`DELETE FROM campaigns WHERE id = ${id} RETURNING id;`;
      } else {
        // Nicht-Admins dürfen nur eigene Kampagnen löschen
        result = await sql`DELETE FROM campaigns WHERE id = ${id} AND inhaber = ${req.user.name} RETURNING id;`;
      }

      const rows = Array.isArray(result) ? result : result.rows || [];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Kampagne nicht gefunden oder keine Berechtigung' });
      }
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Datenbankfehler in campaigns handler:', error.message);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
