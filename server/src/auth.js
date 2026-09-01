import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secure-aaa-quiz-secret-key-2026';
const ADMIN_USERNAME = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

export function signParticipantToken(participant) {
  return jwt.sign(
    {
      id: participant.id,
      email: participant.email,
      name: participant.name,
      role: 'participant',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function signAdminToken() {
  return jwt.sign(
    {
      username: ADMIN_USERNAME,
      role: 'admin',
    },
    JWT_SECRET,
    { expiresIn: '48h' }
  );
}

export function verifyAdminCredentials(username, password) {
  return (
    username?.trim() === ADMIN_USERNAME &&
    password?.trim() === ADMIN_PASSWORD
  );
}

export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function adminAuthMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied: Admin credentials required' });
    }
    next();
  });
}
