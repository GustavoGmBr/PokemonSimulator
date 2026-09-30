import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));
const backend = path.join(root, 'backend');
const frontend = path.join(root, 'frontend');
const backendEnv = path.join(backend, '.env');
const frontendUrl = 'http://127.0.0.1:5173';
const noBrowser = process.argv.includes('--no-browser');
const children = new Map();
let stopping = false;
let childFailure = null;

function envValue(source, name) {
  const match = source.match(new RegExp(`^\\s*${name}\\s*=\\s*(.*)$`, 'm'));
  return match?.[1]?.trim().replace(/^(?:"(.*)"|'(.*)')$/, '$1$2') ?? '';
}

function checkNode() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 12)) {
    throw new Error('Instale Node.js 22.12 ou superior para iniciar o jogo.');
  }
}

function loadConfig() {
  if (!existsSync(backendEnv)) {
    const template = readFileSync(path.join(backend, '.env.example'), 'utf8');
    const secret = randomBytes(48).toString('hex');
    writeFileSync(backendEnv, template.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${secret}"`), { flag: 'wx' });
    throw new Error('Criei backend/.env com uma chave de sessão. Configure DATABASE_URL com os dados do seu MySQL e execute o inicializador novamente.');
  }
  let source = readFileSync(backendEnv, 'utf8');
  if (!envValue(source, 'JWT_SECRET')) {
    source = source.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET="${randomBytes(48).toString('hex')}"`);
    writeFileSync(backendEnv, source);
    console.log('Uma chave de sessão foi gerada em backend/.env.');
  }
  const rawUrl = envValue(source, 'DATABASE_URL');
  let databaseUrl;
  try { databaseUrl = new URL(rawUrl); } catch { /* Mensagem clara abaixo. */ }
  if (databaseUrl?.protocol !== 'mysql:' || !databaseUrl.hostname || !databaseUrl.pathname.slice(1) ||
      !databaseUrl.username || !databaseUrl.password || databaseUrl.password === 'troque-a-senha') {
    throw new Error('Configure DATABASE_URL em backend/.env com um endereço MySQL válido antes de iniciar.');
  }
  if (envValue(source, 'JWT_SECRET').length < 32) {
    throw new Error('JWT_SECRET em backend/.env deve ter pelo menos 32 caracteres.');
  }
  const port = Number(process.env.PORT || envValue(source, 'PORT') || 3334);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT em backend/.env deve estar entre 1 e 65535.');
  }
  return { port, apiUrl: `http://127.0.0.1:${port}/api/health/ready` };
}

function run(label, cwd, command) {
  console.log(`\n${label}...`);
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const child = spawn(isWindows ? 'cmd.exe' : 'npm', isWindows
      ? ['/d', '/s', '/c', `npm ${command.join(' ')}`]
      : command, { cwd, stdio: 'inherit', windowsHide: false });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${label} falhou (código ${code}).`)));
  });
}

function runNode(label, cwd, script) {
  console.log(`\n${label}...`);
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], { cwd, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(`${label} falhou (código ${code}).`)));
  });
}

async function ensureDependencies(directory) {
  if (existsSync(path.join(directory, 'node_modules'))) return;
  await run(`Instalando dependências de ${path.basename(directory)}`, directory, ['ci']);
}

async function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolve(true); });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => { socket.destroy(); resolve(false); });
  });
}

async function isApiReady(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1500) });
    const body = await response.json();
    return response.ok && body?.success === true && body?.data?.database === 'online';
  } catch { return false; }
}

async function isFrontendReady() {
  try {
    const response = await fetch(frontendUrl, { signal: AbortSignal.timeout(1500) });
    return response.ok && (await response.text()).includes('<title>Pokémon Simulator');
  } catch { return false; }
}

async function waitUntil(check, label) {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (childFailure) throw childFailure;
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`${label} não respondeu em 30 segundos. Confira as mensagens acima.`);
}

function startService(name, cwd, script, args = []) {
  const child = spawn(process.execPath, [script, ...args], { cwd, stdio: 'inherit' });
  children.set(name, child);
  child.once('error', (error) => { childFailure = new Error(`${name}: ${error.message}`); });
  child.once('exit', (code) => {
    children.delete(name);
    if (!stopping) {
      childFailure = new Error(`${name} encerrou inesperadamente (código ${code}).`);
      console.error(`\n${childFailure.message}`);
      stop();
      process.exitCode = 1;
    }
  });
}

function stop() {
  if (stopping) return;
  stopping = true;
  for (const child of children.values()) child.kill();
}

function openBrowser() {
  if (noBrowser) return;
  const command = process.platform === 'win32' ? 'cmd.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32'
    ? ['/d', '/s', '/c', `start "" "${frontendUrl}"`]
    : [frontendUrl];
  const opener = spawn(command, args, { stdio: 'ignore', windowsHide: true });
  opener.once('error', () => console.log(`Abra ${frontendUrl} no navegador.`));
  opener.unref();
}

async function main() {
  checkNode();
  const config = loadConfig();
  const apiReady = await isApiReady(config.apiUrl);
  const webReady = await isFrontendReady();
  if (!apiReady && await isPortOpen(config.port)) {
    throw new Error(`A porta ${config.port} já está ocupada por outro processo.`);
  }
  if (!webReady && await isPortOpen(5173)) {
    throw new Error('A porta 5173 já está ocupada por outro processo.');
  }

  if (!apiReady) {
    await ensureDependencies(backend);
    await run('Gerando Prisma Client', backend, ['run', 'prisma:generate']);
    await run('Aplicando migrations', backend, ['run', 'db:migrate']);
    await runNode('Verificando golpes no banco', backend, 'scripts/seed-moves-if-needed.js');
    console.log('\nIniciando API...');
    startService('API', backend, 'src/server.js');
    await waitUntil(() => isApiReady(config.apiUrl), 'API');
  } else {
    console.log('API já está ativa.');
  }

  if (!webReady) {
    await ensureDependencies(frontend);
    console.log('\nIniciando interface...');
    startService('Interface', frontend, 'node_modules/vite/bin/vite.js', ['--host', '127.0.0.1']);
    await waitUntil(isFrontendReady, 'Interface');
  } else {
    console.log('Interface já está ativa.');
  }

  console.log(`\nJogo pronto: ${frontendUrl}`);
  if (children.size) console.log('Mantenha esta janela aberta enquanto joga. Ctrl+C encerra o jogo.');
  openBrowser();
}

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

main().catch((error) => {
  console.error(`\nNão foi possível iniciar: ${error.message}`);
  stop();
  process.exitCode = 1;
});
