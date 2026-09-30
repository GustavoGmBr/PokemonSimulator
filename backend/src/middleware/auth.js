import jwt from 'jsonwebtoken';

export function authenticate(config) {
  return (req, res, next) => {
    const match = /^Bearer (\S+)$/i.exec(req.headers.authorization ?? '');
    if (!match) return res.status(401).json({ success: false, error: 'Autenticacao necessaria.' });
    try {
      const payload = jwt.verify(match[1], config.JWT_SECRET, {
        algorithms: ['HS256'], issuer: 'pokemon-simulator', audience: 'pokemon-simulator-web',
      });
      if (typeof payload.sub !== 'string' || !payload.sub) throw new Error('Invalid subject');
      req.usuarioId = payload.sub;
      next();
    } catch {
      return res.status(401).json({ success: false, error: 'Token invalido ou expirado.' });
    }
  };
}
