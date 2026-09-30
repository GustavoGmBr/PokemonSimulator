import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { HttpError } from '../lib/errors.js';

export const publicUserSelect = { id: true, login: true, criadoEm: true };

export function createAuthService(db, config) {
  // Mantem o custo de comparacao semelhante para logins inexistentes.
  const dummyHash = bcrypt.hashSync('invalid-credentials-placeholder', 12);
  function session(usuario) {
    const token = jwt.sign({}, config.JWT_SECRET, {
      subject: usuario.id, expiresIn: config.JWT_EXPIRES_IN, algorithm: 'HS256',
      issuer: 'pokemon-simulator', audience: 'pokemon-simulator-web',
    });
    return { usuario: { id: usuario.id, login: usuario.login, criadoEm: usuario.criadoEm }, token, tokenType: 'Bearer' };
  }
  return {
    async register({ login, senha, nomeTreinador }) {
      const senhaHash = await bcrypt.hash(senha, 12);
      // A criacao aninhada e atomica: conta e save sao persistidos juntos.
      const usuario = await db.usuario.create({
        data: { login, senhaHash, save: { create: { nomeTreinador } } },
        select: publicUserSelect,
      });
      return session(usuario);
    },
    async login({ login, senha }) {
      const usuario = await db.usuario.findUnique({ where: { login } });
      const valid = await bcrypt.compare(senha, usuario?.senhaHash ?? dummyHash);
      if (!usuario || !valid) throw new HttpError(401, 'Login ou senha invalidos.');
      return session(usuario);
    },
    async me(id) {
      const usuario = await db.usuario.findUnique({ where: { id }, select: publicUserSelect });
      if (!usuario) throw new HttpError(401, 'Usuario nao encontrado.');
      return usuario;
    },
  };
}
