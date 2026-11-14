import { requireAuth } from './_lib/auth.js';
import {
  PUBLISHER_ALLOWED_MEDIUMS,
  isValidSlug,
  validateLinkPayload,
} from './_lib/utmRules.js';

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
        new_publisher,
      } = payload;

      let createdSource = null;

      if (new_publisher) {
        const pubSlug = (new_publisher.slug || '').trim();
        const pubLabel = (new_publisher.label || pubSlug).trim();

        if (!isValidSlug(pubSlug) || pubSlug !== utm_source.trim()) {
          return res.status(400).json({
            error: 'Neuer Publisher-Slug verstößt gegen die Naming Convention (nur Kleinbuchstaben a-z, Ziffern 0-9 und Bindestrich - erlaubt)',
          });
        }

        if (!PUBLISHER_ALLOWED_MEDIUMS.includes(utm_medium)) {
          return res.status(400).json({
            error: `Für Publisher sind nur folgende Mediums erlaubt: ${PUBLISHER_ALLOWED_MEDIUMS.join(', ')}`,
          });
        }

        const existingResult = await sql`SELECT id, slug FROM utm_sources WHERE slug = ${pubSlug};`;
        const existingRows = Array.isArray(existingResult) ? existingResult : existingResult.rows || [];
        if (existingRows.length > 0) {
          return res.status(409).json({
            error: `Source "${pubSlug}" existiert bereits in der Datenbank. Bitte direkt aus dem Dropdown wählen.`,
          });
        }

        const insertSourceResult = await sql`
          INSERT INTO utm_sources (
            slug, label, category, default_medium, allowed_mediums, shortlink_path, is_active, created_by
          )
          VALUES (
            ${pubSlug},
            ${pubLabel},
            'publisher',
            'advertorial',
            ${PUBLISHER_ALLOWED_MEDIUMS},
            NULL,
            TRUE,
            ${user.name}
          )
          RETURNING *;
        `;
        const sourceRows = Array.isArray(insertSourceResult)
          ? insertSourceResult
          : insertSourceResult.rows || [];
        createdSource = sourceRows[0] || null;
      }

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
      return res.status(201).json({ link: rows[0], createdSource });
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
