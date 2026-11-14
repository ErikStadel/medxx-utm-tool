import { requireAuth } from './_lib/auth.js';
import { validateLinkPayload } from './_lib/utmRules.js';

export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { sql, user } = auth;

    if (req.method === 'GET') {
      const result = await sql`
        SELECT * FROM saved_links
        ORDER BY created_at DESC, id DESC;
      `;
      const rows = Array.isArray(result) ? result : result.rows || [];
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const payload = req.body || {};
      const validationError = validateLinkPayload(payload);
      if (validationError) {
        return res.status(400).json({ error: validationError });
      }

      const {
        base_url,
        full_url,
        tracking_template,
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        custom_params,
        shortlink_url,
        note,
      } = payload;

      const result = await sql`
        INSERT INTO saved_links (
          base_url,
          full_url,
          tracking_template,
          utm_source,
          utm_medium,
          utm_campaign,
          utm_content,
          utm_term,
          custom_params,
          shortlink_url,
          note,
          created_by
        )
        VALUES (
          ${base_url.trim()},
          ${full_url.trim()},
          ${tracking_template.trim()},
          ${utm_source.trim()},
          ${utm_medium.trim()},
          ${utm_campaign.trim()},
          ${utm_content ? utm_content.trim() : null},
          ${utm_term ? utm_term.trim() : null},
          ${custom_params ? custom_params.trim() : null},
          ${shortlink_url ? shortlink_url.trim() : null},
          ${note ? note.trim() : null},
          ${user.name}
        )
        RETURNING *;
      `;
      const rows = Array.isArray(result) ? result : result.rows || [];
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID erforderlich' });
      }

      const result =
        user.role === 'admin'
          ? await sql`DELETE FROM saved_links WHERE id = ${id} RETURNING id;`
          : await sql`DELETE FROM saved_links WHERE id = ${id} AND created_by = ${user.name} RETURNING id;`;

      const rows = Array.isArray(result) ? result : result.rows || [];
      if (rows.length === 0) {
        return res.status(404).json({ error: 'Link nicht gefunden oder keine Berechtigung' });
      }
      return res.status(204).end();
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Datenbankfehler in links handler:', error.message);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
