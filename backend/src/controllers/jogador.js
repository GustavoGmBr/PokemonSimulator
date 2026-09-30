export function createJogadorController(service) {
  return {
    novoSave: async (req, res) => res.status(201).json({ success: true, data: await service.novoSave(req.usuarioId, req.body) }),
    inicial: async (req, res) => res.status(201).json({ success: true, data: await service.escolherInicial(req.usuarioId, req.body) }),
    save: async (req, res) => res.json({ success: true, data: await service.getSave(req.usuarioId) }),
    updateSave: async (req, res) => res.json({ success: true, data: await service.updateSave(req.usuarioId, req.body) }),
    time: async (req, res) => res.json({ success: true, data: await service.getTime(req.usuarioId) }),
    pc: async (req, res) => res.json({ success: true, data: await service.getPc(req.usuarioId) }),
    colecao: async (req, res) => res.json({ success: true, data: await service.getColecao(req.usuarioId) }),
    favorito: async (req, res) => res.json({ success: true, data: await service.setFavorito(req.usuarioId, req.params.id, req.body.favorito) }),
    inventario: async (req, res) => res.json({ success: true, data: await service.getInventario(req.usuarioId) }),
  };
}
