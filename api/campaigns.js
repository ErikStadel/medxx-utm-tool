import { requireAuth } from './_lib/auth.js';
import { validateCampaignName } from './_lib/utmRules.js';

function resolveCampaignParts(body = {}) {
  const { name, topic_slug, audience_slug, funnel_slug } = body;
  if (topic_slug && audience_slug && funnel_slug) {
    const t = topic_slug.trim();
    const a = audience_slug.trim();
    const f = funnel_slug.trim();
    return {
      name: `${t}_${a}_${f}`,
      topic_slug: t,
      audience_slug: a,
      funnel_slug: f,
    };
  }
  const trimmedName = (name || '').trim();
  const parts = trimmedName.split('_');
  return {
    name: trimmedName,
    topic_slug: parts[0] || null,
    audience_slug: parts[1] || null,
    funnel_slug: parts[2] || null,
  };
}

export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { sql, user } = auth;

    if (req.method === 'GET') {
      const result =
        user.role === 'admin'
          ? await sql`SELECT * FROM campaigns ORDER BY id DESC;`
          : await sql`
              SELECT * FROM campaigns
              WHERE inhaber = ${user.name} OR inhaber = 'alle'
              ORDER BY id DESC;
            `;
      const rows = Array.isArray(result) ? result : result.rows || [];
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { category, inhaber: providedInhaber } = req.body || {};
      const { name, topic_slug, audience_slug, funnel_slug } = resolveCampaignParts(req.body);

      const funnelResult = await sql`
        SELECT slug FROM utm_components
        WHERE component_type = 'funnel' AND is_active = TRUE;
      `;
      const allowedFunnels = (Array.isArray(funnelResult) ? funnelResult : funnelResult.rows || []).map(
        (r) => r.slug
      );

      const nameErr = validateCampaignName(name, allowedFunnels);
      if (nameErr) {
        return res.status(400).json({ error: nameErr });
      }

      const finalCategory = (category || topic_slug || '').trim();
      const finalInhaber = user.role === 'admin' && providedInhaber === 'alle' ? 'alle' : user.name;

      const result = await sql`
        INSERT INTO campaigns (name, category, archived, inhaber, topic_slug, audience_slug, funnel_slug)
        VALUES (${name}, ${finalCategory}, FALSE, ${finalInhaber}, ${topic_slug}, ${audience_slug}, ${funnel_slug})
        RETURNING *;
      `;
      const rows = Array.isArray(result) ? result : result.rows || [];
      return res.status(201).json(rows[0]);
    }

    if (req.method === 'PUT') {
      const { id, category, archived, inhaber: providedInhaber } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID erforderlich' });
      }

      const { name, topic_slug, audience_slug, funnel_slug } = resolveCampaignParts(req.body);
      const funnelResult = await sql`
        SELECT slug FROM utm_components
        WHERE component_type = 'funnel' AND is_active = TRUE;
      `;
      const allowedFunnels = (Array.isArray(funnelResult) ? funnelResult : funnelResult.rows || []).map(
        (r) => r.slug
      );
      const nameErr = validateCampaignName(name, allowedFunnels);
      if (nameErr) {
        return res.status(400).json({ error: nameErr });
      }

      const finalCategory = (category || topic_slug || '').trim();
      const isArchived = Boolean(archived);

      let result;
      if (user.role === 'admin') {
        const finalInhaber = providedInhaber || user.name;
        result = await sql`
          UPDATE campaigns
          SET
            name = ${name},
            category = ${finalCategory},
            archived = ${isArchived},
            inhaber = ${finalInhaber},
            topic_slug = ${topic_slug},
            audience_slug = ${audience_slug},
            funnel_slug = ${funnel_slug}
          WHERE id = ${id}
          RETURNING *;
        `;
      } else {
        result = await sql`
          UPDATE campaigns
          SET
            name = ${name},
            category = ${finalCategory},
            archived = ${isArchived},
            inhaber = ${user.name},
            topic_slug = ${topic_slug},
            audience_slug = ${audience_slug},
            funnel_slug = ${funnel_slug}
          WHERE id = ${id} AND inhaber = ${user.name}
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

      const result =
        user.role === 'admin'
          ? await sql`DELETE FROM campaigns WHERE id = ${id} RETURNING id;`
          : await sql`DELETE FROM campaigns WHERE id = ${id} AND inhaber = ${user.name} RETURNING id;`;

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
