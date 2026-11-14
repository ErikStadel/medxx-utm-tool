import { requireAuth } from './_lib/auth.js';
import {
  SOURCE_CATEGORIES,
  USER_CREATABLE_SOURCE_CATEGORIES,
  isDynamicPlatformToken,
  isValidSlug,
  normalizeSlug,
} from './_lib/utmRules.js';

const ADMIN_EDITABLE_COMPONENT_TYPES = ['topic', 'audience', 'angle', 'format'];

export default async function handler(req, res) {
  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;
    const { sql, user } = auth;
    const isAdmin = user.role === 'admin';

    if (req.method === 'GET') {
      const sourcesResult = isAdmin
        ? await sql`SELECT * FROM utm_sources ORDER BY category, label;`
        : await sql`SELECT * FROM utm_sources WHERE is_active = TRUE ORDER BY category, label;`;

      const componentsResult = isAdmin
        ? await sql`SELECT * FROM utm_components ORDER BY component_type, sort_order, slug;`
        : await sql`SELECT * FROM utm_components WHERE is_active = TRUE ORDER BY component_type, sort_order, slug;`;

      const sources = Array.isArray(sourcesResult) ? sourcesResult : sourcesResult.rows || [];
      const components = Array.isArray(componentsResult) ? componentsResult : componentsResult.rows || [];

      return res.status(200).json({ sources, components });
    }

    if (req.method === 'POST') {
      const { entityType } = req.body || {};

      if (entityType === 'source') {
        const {
          slug: rawSlug,
          label,
          category,
          default_medium,
          allowed_mediums,
          shortlink_path,
        } = req.body || {};

        if (!category || !SOURCE_CATEGORIES.includes(category)) {
          return res.status(400).json({ error: 'Ungültige Source-Kategorie' });
        }

        if (!isAdmin && !USER_CREATABLE_SOURCE_CATEGORIES.includes(category)) {
          return res.status(403).json({
            error: 'Standard-Nutzer dürfen nur neue Partner und Messen anlegen',
          });
        }

        const rawInput = (rawSlug || label || '').trim();
        const cleanSlug =
          isAdmin && isDynamicPlatformToken(rawInput) ? rawInput : normalizeSlug(rawInput);
        if (!isValidSlug(cleanSlug) && !(isAdmin && isDynamicPlatformToken(cleanSlug))) {
          return res.status(400).json({
            error: 'Slug ist ungültig (nur Kleinbuchstaben a-z, Ziffern 0-9 und Bindestriche - erlaubt)',
          });
        }

        const cleanLabel = (label || cleanSlug).trim();

        const mediumRowsRaw = await sql`
          SELECT slug FROM utm_components
          WHERE component_type = 'medium' AND is_active = TRUE;
        `;
        const dbMediums = (Array.isArray(mediumRowsRaw) ? mediumRowsRaw : mediumRowsRaw.rows || []).map(
          (r) => r.slug
        );

        const validDefaultMedium =
          default_medium && dbMediums.includes(default_medium) ? default_medium : null;
        const validAllowedMediums = Array.isArray(allowed_mediums)
          ? allowed_mediums.filter((m) => dbMediums.includes(m))
          : validDefaultMedium
            ? [validDefaultMedium]
            : [];

        try {
          const result = await sql`
            INSERT INTO utm_sources (
              slug, label, category, default_medium, allowed_mediums, shortlink_path, is_active, created_by
            )
            VALUES (
              ${cleanSlug},
              ${cleanLabel},
              ${category},
              ${validDefaultMedium},
              ${validAllowedMediums},
              ${shortlink_path ? shortlink_path.trim() : null},
              TRUE,
              ${user.name}
            )
            RETURNING *;
          `;
          const rows = Array.isArray(result) ? result : result.rows || [];
          return res.status(201).json(rows[0]);
        } catch (err) {
          if (err.code === '23505') {
            return res.status(409).json({ error: `Source "${cleanSlug}" existiert bereits` });
          }
          throw err;
        }
      }

      if (entityType === 'component') {
        if (!isAdmin) {
          return res.status(403).json({
            error: 'Nur Admins dürfen neue Themen, Zielgruppen, Angles oder Formate anlegen',
          });
        }

        const { component_type, slug: rawSlug, label, description, sort_order } = req.body || {};
        if (!ADMIN_EDITABLE_COMPONENT_TYPES.includes(component_type)) {
          return res.status(400).json({
            error: 'Nur topic, audience, angle und format können angelegt werden (medium und funnel sind geschützt)',
          });
        }

        const cleanSlug = normalizeSlug(rawSlug || label);
        if (!isValidSlug(cleanSlug)) {
          return res.status(400).json({
            error: 'Slug ist ungültig (nur Kleinbuchstaben a-z, Ziffern 0-9 und Bindestriche - erlaubt)',
          });
        }

        const cleanLabel = (label || cleanSlug).trim();
        const orderVal = Number.isFinite(Number(sort_order)) ? Number(sort_order) : 100;

        try {
          const result = await sql`
            INSERT INTO utm_components (
              component_type, slug, label, description, sort_order, is_locked, is_active, created_by
            )
            VALUES (
              ${component_type},
              ${cleanSlug},
              ${cleanLabel},
              ${description ? description.trim() : null},
              ${orderVal},
              FALSE,
              TRUE,
              ${user.name}
            )
            RETURNING *;
          `;
          const rows = Array.isArray(result) ? result : result.rows || [];
          return res.status(201).json(rows[0]);
        } catch (err) {
          if (err.code === '23505') {
            return res.status(409).json({
              error: `Baustein "${cleanSlug}" existiert bereits unter ${component_type}`,
            });
          }
          throw err;
        }
      }

      return res.status(400).json({ error: 'entityType ("source" oder "component") erforderlich' });
    }

    if (req.method === 'PUT') {
      const { entityType, id } = req.body || {};
      if (!id) {
        return res.status(400).json({ error: 'ID erforderlich' });
      }

      if (entityType === 'source') {
        const existingResult = await sql`SELECT * FROM utm_sources WHERE id = ${id};`;
        const existingRows = Array.isArray(existingResult) ? existingResult : existingResult.rows || [];
        const existing = existingRows[0];
        if (!existing) {
          return res.status(404).json({ error: 'Source nicht gefunden' });
        }

        if (
          !isAdmin &&
          (!USER_CREATABLE_SOURCE_CATEGORIES.includes(existing.category) || existing.created_by !== user.name)
        ) {
          return res.status(403).json({
            error: 'Keine Berechtigung zum Bearbeiten dieser Source',
          });
        }

        const mediumRowsRaw = await sql`
          SELECT slug FROM utm_components
          WHERE component_type = 'medium' AND is_active = TRUE;
        `;
        const dbMediums = (Array.isArray(mediumRowsRaw) ? mediumRowsRaw : mediumRowsRaw.rows || []).map(
          (r) => r.slug
        );

        const { label, default_medium, allowed_mediums, shortlink_path, is_active } = req.body || {};
        const nextLabel = label !== undefined ? label.trim() : existing.label;
        const nextDefaultMedium =
          default_medium !== undefined
            ? dbMediums.includes(default_medium)
              ? default_medium
              : null
            : existing.default_medium;
        const nextAllowedMediums =
          allowed_mediums !== undefined
            ? Array.isArray(allowed_mediums)
              ? allowed_mediums.filter((m) => dbMediums.includes(m))
              : []
            : existing.allowed_mediums;
        const nextShortlink =
          shortlink_path !== undefined ? (shortlink_path ? shortlink_path.trim() : null) : existing.shortlink_path;
        const nextActive = typeof is_active === 'boolean' ? is_active : existing.is_active;

        const result = await sql`
          UPDATE utm_sources
          SET
            label = ${nextLabel},
            default_medium = ${nextDefaultMedium},
            allowed_mediums = ${nextAllowedMediums},
            shortlink_path = ${nextShortlink},
            is_active = ${nextActive}
          WHERE id = ${id}
          RETURNING *;
        `;
        const rows = Array.isArray(result) ? result : result.rows || [];
        return res.status(200).json(rows[0]);
      }

      if (entityType === 'component') {
        if (!isAdmin) {
          return res.status(403).json({ error: 'Nur Admins dürfen Bausteine bearbeiten' });
        }

        const existingResult = await sql`SELECT * FROM utm_components WHERE id = ${id};`;
        const existingRows = Array.isArray(existingResult) ? existingResult : existingResult.rows || [];
        const existing = existingRows[0];
        if (!existing) {
          return res.status(404).json({ error: 'Baustein nicht gefunden' });
        }
        if (existing.is_locked) {
          return res.status(403).json({ error: 'Geschützte System-Standards können nicht geändert werden' });
        }

        const { label, description, sort_order, is_active } = req.body || {};
        const nextLabel = label !== undefined ? label.trim() : existing.label;
        const nextDescription =
          description !== undefined ? (description ? description.trim() : null) : existing.description;
        const nextOrder = sort_order !== undefined ? Number(sort_order) : existing.sort_order;
        const nextActive = typeof is_active === 'boolean' ? is_active : existing.is_active;

        const result = await sql`
          UPDATE utm_components
          SET
            label = ${nextLabel},
            description = ${nextDescription},
            sort_order = ${nextOrder},
            is_active = ${nextActive}
          WHERE id = ${id}
          RETURNING *;
        `;
        const rows = Array.isArray(result) ? result : result.rows || [];
        return res.status(200).json(rows[0]);
      }

      return res.status(400).json({ error: 'entityType ("source" oder "component") erforderlich' });
    }

    if (req.method === 'DELETE') {
      const { entityType, id } = req.body || {};
      if (!id || !entityType) {
        return res.status(400).json({ error: 'entityType und id erforderlich' });
      }

      if (entityType === 'source') {
        if (!isAdmin) {
          const result = await sql`
            DELETE FROM utm_sources
            WHERE id = ${id} AND created_by = ${user.name} AND category IN ('partner', 'event')
            RETURNING id;
          `;
          const rows = Array.isArray(result) ? result : result.rows || [];
          if (rows.length === 0) {
            return res.status(403).json({ error: 'Keine Berechtigung oder Source nicht gefunden' });
          }
          return res.status(204).end();
        }

        const result = await sql`DELETE FROM utm_sources WHERE id = ${id} RETURNING id;`;
        const rows = Array.isArray(result) ? result : result.rows || [];
        if (rows.length === 0) {
          return res.status(404).json({ error: 'Source nicht gefunden' });
        }
        return res.status(204).end();
      }

      if (entityType === 'component') {
        if (!isAdmin) {
          return res.status(403).json({ error: 'Nur Admins dürfen Bausteine löschen' });
        }
        const existingResult = await sql`SELECT is_locked FROM utm_components WHERE id = ${id};`;
        const existingRows = Array.isArray(existingResult) ? existingResult : existingResult.rows || [];
        if (existingRows.length === 0) {
          return res.status(404).json({ error: 'Baustein nicht gefunden' });
        }
        if (existingRows[0].is_locked) {
          return res.status(403).json({ error: 'Geschützte System-Standards können nicht gelöscht werden' });
        }
        await sql`DELETE FROM utm_components WHERE id = ${id};`;
        return res.status(204).end();
      }

      return res.status(400).json({ error: 'Ungültiger entityType' });
    }

    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  } catch (error) {
    console.error('Datenbankfehler in taxonomy handler:', error.message);
    return res.status(500).json({ error: 'Interner Serverfehler' });
  }
}
