import { requireAuth } from './_lib/auth.js';
import { isValidSlug, validateLinkPayload } from './_lib/utmRules.js';

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

      // Aktive Mediums und Funnels direkt aus Neon laden (nichts hardcoden)
      const compResult = await sql`
        SELECT component_type, slug FROM utm_components
        WHERE component_type IN ('medium', 'funnel') AND is_active = TRUE;
      `;
      const compRows = Array.isArray(compResult) ? compResult : compResult.rows || [];
      const allowedMediums = compRows
        .filter((r) => r.component_type === 'medium')
        .map((r) => r.slug);
      const allowedFunnels = compRows
        .filter((r) => r.component_type === 'funnel')
        .map((r) => r.slug);

      const validationError = validateLinkPayload(payload, { allowedMediums, allowedFunnels });
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
            error:
              'Neuer Publisher-Slug verstößt gegen die Naming Convention (nur Kleinbuchstaben a-z, Ziffern 0-9 und Bindestrich - erlaubt)',
          });
        }

        const existingResult = await sql`SELECT id, slug FROM utm_sources WHERE slug = ${pubSlug};`;
        const existingRows = Array.isArray(existingResult)
          ? existingResult
          : existingResult.rows || [];
        if (existingRows.length > 0) {
          return res.status(409).json({
            error: `Source "${pubSlug}" existiert bereits in der Datenbank. Bitte direkt aus dem Dropdown wählen.`,
          });
        }

        // Erlaubte Mediums dynamisch aus bestehenden Publishern in Neon ableiten
        const pubResult = await sql`
          SELECT allowed_mediums FROM utm_sources
          WHERE category = 'publisher' AND is_active = TRUE;
        `;
        const pubRows = Array.isArray(pubResult) ? pubResult : pubResult.rows || [];
        const derivedMediumsSet = new Set();
        pubRows.forEach((r) => {
          if (Array.isArray(r.allowed_mediums)) {
            r.allowed_mediums.forEach((m) => derivedMediumsSet.add(m));
          }
        });
        const publisherAllowedMediums =
          derivedMediumsSet.size > 0
            ? Array.from(derivedMediumsSet).filter((m) => allowedMediums.includes(m))
            : allowedMediums;

        if (publisherAllowedMediums.length > 0 && !publisherAllowedMediums.includes(utm_medium)) {
          return res.status(400).json({
            error: `Für Publisher sind nur folgende Mediums erlaubt: ${publisherAllowedMediums.join(', ')}`,
          });
        }

        const defaultPubMedium = publisherAllowedMediums.includes('advertorial')
          ? 'advertorial'
          : publisherAllowedMediums[0] || utm_medium;

        const insertSourceResult = await sql`
          INSERT INTO utm_sources (
            slug, label, category, default_medium, allowed_mediums, shortlink_path, is_active, created_by
          )
          VALUES (
            ${pubSlug},
            ${pubLabel},
            'publisher',
            ${defaultPubMedium},
            ${publisherAllowedMediums},
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
      } else {
        // Bestehende Source und ihre erlaubten Mediums direkt gegen Neon prüfen
        const sourceResult = await sql`
          SELECT slug, allowed_mediums FROM utm_sources
          WHERE slug = ${utm_source.trim()} AND is_active = TRUE;
        `;
        const sourceRows = Array.isArray(sourceResult) ? sourceResult : sourceResult.rows || [];
        if (sourceRows.length === 0) {
          return res.status(400).json({
            error: `utm_source "${utm_source}" ist nicht in der Datenbank hinterlegt`,
          });
        }
        const sourceAllowed = sourceRows[0].allowed_mediums;
        if (Array.isArray(sourceAllowed) && sourceAllowed.length > 0 && !sourceAllowed.includes(utm_medium)) {
          return res.status(400).json({
            error: `utm_medium "${utm_medium}" ist für Source "${utm_source}" nicht erlaubt`,
          });
        }
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
