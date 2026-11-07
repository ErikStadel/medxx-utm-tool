import { serialize } from 'cookie';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  }

  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const isHttps = (req.headers['x-forwarded-proto'] || '').includes('https');
  const useSecure = isProd || isHttps;

  res.setHeader('Set-Cookie', serialize('userToken', '', {
    httpOnly: true,
    secure: useSecure,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  }));

  return res.status(200).json({ success: true });
}
