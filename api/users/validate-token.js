import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    console.log('Cookies im Request:', req.headers.cookie);

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Methode nicht erlaubt' });
    }

    try {
        // Hole das Token aus dem Cookie-String
        const cookies = req.headers.cookie || '';
        const token = cookies
            .split(';')
            .map(c => c.trim())
            .find(c => c.startsWith('userToken='))
            ?.split('=')[1];

        if (!token) {
            return res.status(401).json({ error: 'Kein Token im Cookie gefunden' });
        }

        // Überprüfe das Token
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        return res.status(200).json({ name: payload.name, role: payload.role });
    } catch (error) {
        console.error('Fehler beim Validieren des Tokens:', error);
        return res.status(401).json({ error: 'Ungültiges Token' });
    }
}