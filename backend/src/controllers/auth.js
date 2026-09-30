export function createAuthController(service) {
  return {
    register: async (req, res) => res.status(201).json({ success: true, data: await service.register(req.body) }),
    login: async (req, res) => res.json({ success: true, data: await service.login(req.body) }),
    me: async (req, res) => res.json({ success: true, data: await service.me(req.usuarioId) }),
  };
}
