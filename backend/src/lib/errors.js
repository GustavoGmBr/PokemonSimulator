export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.code === 'P2034') {
    return res.status(409).json({ success: false, error: 'Outra operacao alterou seu save. Atualize a tela e tente novamente.' });
  }
  if (error.code === 'P2002') {
    return res.status(409).json({ success: false, error: 'Registro ja existente.' });
  }
  if (error.code === 'P2025') {
    return res.status(404).json({ success: false, error: 'Registro nao encontrado.' });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: 'JSON invalido.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: 'Corpo da requisicao muito grande.' });
  }
  const status = error instanceof HttpError ? error.status : 500;
  // Nao registrar mensagens do Prisma: elas podem conter dados de consultas.
  if (status === 500) console.error('Falha interna na API.', { type: error.name });
  return res.status(status).json({
    success: false,
    error: status === 500 ? 'Erro interno do servidor.' : error.message,
  });
}
