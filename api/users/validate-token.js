import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Methode nicht erlaubt' });
  }

  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: 'Serverkonfigurationsfehler: JWT_SECRET fehlt' });
  }

  try {
    const cookies = req.headers.cookie || '';
    const token = cookies
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('userToken='))
      ?.split('=')[1];

    if (!token) {
      return res.status(401).json({ error: 'Kein Token im Cookie gefunden' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({ name: payload.name, role: payload.role });
  } catch (error) {
    return res.status(401).json({ error: 'Ungültiges oder abgelaufenes Token' });
  }
}
