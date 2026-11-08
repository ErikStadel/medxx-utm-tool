import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  }

  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ error: 'Serverkonfigurationsfehler: JWT_SECRET fehlt' });
    }
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: 'Serverkonfigurationsfehler: DATABASE_URL / POSTGRES_URL fehlt' });
    }

    const { name, password } = req.body || {};
    if (!name || !password) {
      return res.status(400).json({ error: 'Name und Passwort erforderlich' });
    }

    const sql = neon(dbUrl);
    const result = await sql`
      SELECT id, name, role, password 
      FROM users 
      WHERE name = ${name.trim().toLowerCase()};
    `;
    const rows = Array.isArray(result) ? result : result?.rows || [];
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort' });
    }

    // Passwort-Verifikation:
    // 1. Wenn ein individuelles Passwort in der DB hinterlegt ist, dieses prüfen.
    // 2. Ansonsten: Falls Admin -> ADMIN_PASSWORD oder APP_PASSWORD prüfen; Falls Standard-User -> APP_PASSWORD prüfen.
    let isPasswordValid = false;

    if (user.password && user.password.trim() !== '') {
      isPasswordValid = (password === user.password);
    } else {
      const appPassword = process.env.APP_PASSWORD;
      const adminPassword = process.env.ADMIN_PASSWORD;

      if (user.role === 'admin' && adminPassword && password === adminPassword) {
        isPasswordValid = true;
      } else if (appPassword && password === appPassword) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Ungültiger Benutzername oder Passwort' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    const isHttps = (req.headers['x-forwarded-proto'] || '').includes('https');
    const useSecure = isProd || isHttps;

    res.setHeader('Set-Cookie', serialize('userToken', token, {
      httpOnly: true,
      secure: useSecure,
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60,
      path: '/',
    }));

    return res.status(200).json({ name: user.name, role: user.role });
  } catch (error) {
    console.error('Fehler beim Login:', error.message);
    return res.status(500).json({ error: 'Interner Serverfehler beim Login' });
  }
}
