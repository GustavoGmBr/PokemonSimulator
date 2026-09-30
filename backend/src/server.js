import { parseEnv } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { createApp } from './app.js';

let server;
try {
  const config = parseEnv(process.env);
  const app = createApp({ db: prisma, config });
  await prisma.$connect();
  server = app.listen(config.PORT, config.HOST, () => {
    console.log(`Pokemon Simulator API: http://${config.HOST}:${config.PORT}/api/health`);
  });
  server.on('error', async (error) => {
    console.error('Nao foi possivel abrir a porta HTTP.', { code: error.code });
    await prisma.$disconnect();
    process.exitCode = 1;
  });
} catch (error) {
  console.error(error.message.startsWith('Configuracao invalida')
    ? error.message : 'Falha ao iniciar a API. Verifique o MySQL, o .env e as migrations.');
  await prisma.$disconnect();
  process.exitCode = 1;
}

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timeout = setTimeout(() => process.exit(1), 10_000);
  timeout.unref();
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await prisma.$disconnect();
  clearTimeout(timeout);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
