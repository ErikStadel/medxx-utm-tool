import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { parse } from 'cookie';

export default async function handler(req, res) {
  try {
    // Authentifizierung
    const cookies = parse(req.headers.cookie || '');
    const token = cookies.userToken;
    if (!token) {
      return res.status(401).json({ error: 'Nicht authentifiziert' });
    }
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch {
      return res.status(401).json({ error: 'Ungültiges Token' });
    }

    const sql = neon(process.env.DATABASE_URL);
    console.log('API aufgerufen:', req.method, process.env.DATABASE_URL);

    if (req.method === 'GET') {
      const searchTerm = req.query.search || '';
      
      let result;
      
      if (searchTerm.trim()) {
        // Optimierte Suche mit Gewichtung verschiedener Felder
        // Verwendet ILIKE für case-insensitive Suche und OR-Verknüpfung für mehrere Felder
        result = await sql`
          SELECT 
            id, 
            category, 
            name, 
            tags, 
            utm_writing,
            CASE 
              WHEN name ILIKE ${searchTerm} THEN 100
              WHEN name ILIKE ${`${searchTerm}%`} THEN 50
              WHEN utm_writing ILIKE ${`${searchTerm}%`} THEN 40
              WHEN name ILIKE ${`%${searchTerm}%`} THEN 30
              WHEN utm_writing ILIKE ${`%${searchTerm}%`} THEN 25
              WHEN category ILIKE ${`%${searchTerm}%`} THEN 20
              WHEN tags ILIKE ${`%${searchTerm}%`} THEN 15
              ELSE 0
            END as relevance_score
          FROM licenses
          WHERE (
            category ILIKE ${`%${searchTerm}%`} OR 
            name ILIKE ${`%${searchTerm}%`} OR 
            tags ILIKE ${`%${searchTerm}%`} OR 
            utm_writing ILIKE ${`%${searchTerm}%`}
          )
          ORDER BY relevance_score DESC, category, name
          LIMIT 20;
        `;
      } else {
        // Ohne Suchbegriff: alle Lizenzen, sortiert nach Kategorie und Name
        result = await sql`
          SELECT id, category, name, tags, utm_writing
          FROM licenses
          ORDER BY category, name
          LIMIT 100;
        `;
      }
      
      console.log('Rohdatenbankergebnis:', result);
      const rows = Array.isArray(result) ? result : result.rows || [];
      
      // Gruppierung nach Kategorie nur wenn kein spezifischer Suchbegriff
      const licensesByCategory = rows.reduce((acc, row) => {
        const category = row.category || 'Ungekategorisiert';
        if (!acc[category]) acc[category] = [];
        
        // Entferne relevance_score aus dem Client-Response
        const { relevance_score, ...licenseData } = row;
        acc[category].push(licenseData);
        return acc;
      }, {});
      
      console.log('Verarbeitetes Ergebnis:', licensesByCategory);
      
      if (Object.keys(licensesByCategory).length === 0) {
        console.log('Keine Lizenzen gefunden.');
      }
      
      return res.status(200).json(licensesByCategory);
    }

    if (req.method === 'POST') {
      const { category, tags, name, utm_writing } = req.body;
      console.log('POST-Daten:', { category, tags, name, utm_writing });
      
      if (!category || !name || !utm_writing) {
        return res.status(400).json({ error: 'Kategorie, Name und UTM-Schreibweise erforderlich' });
      }
      
      // Prüfe auf Duplikate
      const existingLicense = await sql`
        SELECT id FROM licenses 
        WHERE LOWER(name) = LOWER(${name.trim()}) 
           OR LOWER(utm_writing) = LOWER(${utm_writing.trim()})
        LIMIT 1;
      `;
      
      if (existingLicense.length > 0) {
        return res.status(409).json({ 
          error: 'Eine Lizenz mit diesem Namen oder UTM-Schreibweise existiert bereits' 
        });
      }
      
      const result = await sql`
        INSERT INTO licenses (category, tags, name, utm_writing)
        VALUES (${category.trim()}, ${tags?.trim() || null}, ${name.trim()}, ${utm_writing.trim()})
        RETURNING *;
      `;
      
      console.log('INSERT-Ergebnis:', result);
      const rows = Array.isArray(result) ? result : result.rows || [];
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const { id, category, tags, name, utm_writing } = req.body;
      console.log('PUT-Daten:', { id, category, tags, name, utm_writing });
      
      if (!id) {
        return res.status(400).json({ error: 'ID erforderlich' });
      }
      
      // Prüfe auf Duplikate (ausgenommen die aktuelle Lizenz)
      const existingLicense = await sql`
        SELECT id FROM licenses 
        WHERE (LOWER(name) = LOWER(${name.trim()}) OR LOWER(utm_writing) = LOWER(${utm_writing.trim()}))
          AND id != ${id}
        LIMIT 1;
      `;
      
      if (existingLicense.length > 0) {
        return res.status(409).json({ 
          error: 'Eine andere Lizenz mit diesem Namen oder UTM-Schreibweise existiert bereits' 
        });
      }
      
      const result = await sql`
        UPDATE licenses
        SET 
          category = ${category?.trim() || null}, 
          tags = ${tags?.trim() || null}, 
          name = ${name?.trim() || null}, 
          utm_writing = ${utm_writing?.trim() || null}
        WHERE id = ${id}
        RETURNING *;
      `;
      
      console.log('UPDATE-Ergebnis:', result);
      const rows = Array.isArray(result) ? result : result.rows || [];
      
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Lizenz nicht gefunden' });
      }
      
      return res.status(200).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) {
        return res.status(400).json({ error: 'ID erforderlich' });
      }
      
      const result = await sql`
        DELETE FROM licenses 
        WHERE id = ${id}
        RETURNING id;
      `;
      
      if (result.length === 0) {
        return res.status(404).json({ error: 'Lizenz nicht gefunden' });
      }
      
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Datenbankfehler:', error.message, error.stack);
    return res.status(500).json({ 
      error: 'Interner Serverfehler', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Unbekannter Fehler'
    });
  }
}