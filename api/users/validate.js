import { neon } from '@neondatabase/serverless';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const { name } = req.body || {};
    if (!name) {
      return res.status(400).json({ error: 'Name erforderlich' });
    }

    const result = await sql`SELECT id, name, role FROM users WHERE name = ${name.toLowerCase()};`;
    const rows = Array.isArray(result) ? result : result?.rows || [];
    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Ungültiger User' });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '180d' }
    );

    const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    const isHttps = (req.headers['x-forwarded-proto'] || '').includes('https');
    const useSecure = isProd || isHttps;

    res.setHeader('Set-Cookie', serialize('userToken', token, {
      httpOnly: true,
      secure: useSecure,
      sameSite: 'lax',
      maxAge: 180 * 24 * 60 * 60,
      path: '/',
    }));

    return res.status(200).json({ name: user.name, role: user.role });
  } catch (error) {
    console.error('Fehler:', error);
    return res.status(500).json({ error: 'Serverfehler', details: error.message });
  }
}