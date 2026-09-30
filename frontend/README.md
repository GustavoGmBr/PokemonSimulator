# Pokémon Simulator — frontend

React 18, Vite, Tailwind CSS 4, componentes em JavaScript no padrão shadcn/ui com Radix, Framer Motion, Zustand, TanStack Query, Lucide e React Router. O botão usa o padrão Slot/CVA do shadcn; a confirmação acessível usa Radix AlertDialog, com foco preso ao diálogo e cancelamento por teclado.

## Desenvolvimento

```powershell
npm install
npm run dev
```

Abra http://127.0.0.1:5173. O backend deve estar ativo em 127.0.0.1:3334. Para alterar seu destino, copie `.env.example` para `.env` e configure `API_PROXY_TARGET`. A porta 5173 é fixa; o Vite informa se já estiver em uso.

## Fluxo

- `/login` e `/registro`: acesso à conta.
- `/saves`: carregar a jornada ou criar/substituir o único save.
- `/inicial`: escolher um inicial de qualquer geração, com confirmação.
- `/menu`: ver a coleção em destaque, marcar favoritos, filtrar e ordenar Pokémon; abrir os detalhes de um capturado para evoluir, ativar G-Max ou usar doces.
- `/mercado`: selecionar e vender Pokémon capturados por Pokédólares, inclusive vários de uma vez; favoritos ficam protegidos.
- `/loja`: montar um carrinho com Poké Bolas, itens de cura, evolução e bônus em qualquer quantidade permitida. Master Bola e doces não são vendidos nesta loja.
- `/cassino`: comprar fichas, jogar caça-níqueis, cartas, roleta e Voltorb Flip, e trocar fichas por Poké Bolas (inclusive Master Bola) e itens de cura. A escolha de Pokémon para a roleta mostra sprites, busca por nome e Nº Dex, filtros e ordenação por valor; favoritos não podem ser apostados.
- `/pokedex`: buscar e filtrar os 1.025 Pokémon, ver capturados, shiny, sprites e galeria de formas com requisitos.
- `/selvagens` e `/batalha`: encontrar selvagens ou desafiar treinadores, torneios e líderes; depois de ver o adversário, escolher uma equipe de até o mesmo tamanho da equipe adversária, trocar reservas, atacar, curar ou capturar. O Pokémon do jogador aparece de costas.
- `/perfil`: acompanhar insígnias e histórico de batalhas e capturas.
- `/missoes`: acompanhar dez missões renovadas a cada duas horas, ver a contagem regressiva e resgatar recompensas individualmente ou de uma vez.

As páginas internas validam a sessão. Menu e seleção também validam o estado do save. A aplicação aguarda a confirmação da API antes de navegar após uma gravação. Saves iniciados sem inicial voltam à seleção. Erros de rede e sessão expirada são tratados na interface.

O JWT é persistido em localStorage pelo Zustand para manter o login após recarregar; o logout descarta o token e limpa o cache de consultas. Não há refresh token, recuperação de senha ou revogação antecipada nesta entrega. Não coloque segredos em variáveis `VITE_*`: elas são públicas no bundle.

## Build

```powershell
npm run build
```

Os arquivos ficam em `dist`. Em produção, configure fallback das rotas do frontend para `index.html` e encaminhe `/api` e `/assets/pokemon` para o Express. Alternativamente, defina `VITE_API_ORIGIN` antes do build para um backend separado e permita a origem do frontend no `CORS_ORIGIN` do backend. O proxy Vite é apenas de desenvolvimento. Não houve publicação em hospedagem nesta entrega.

## Teste no navegador

Com frontend, backend, catálogo e banco migrado disponíveis:

```powershell
npx playwright install chromium
npm run test:e2e
```

O Playwright testa em desktop e celular: cadastro, login, novo jogo, evolução, Pokédex, favoritos, filtros, venda de Pokémon, galeria de formas, contagem regressiva e resgate coletivo das missões, indicação de vantagem na batalha e os jogos e a loja do Pokécassino. Também cobre TMs, sprites 2D/3D, itens de cura, loja, torneios, desafios e substituição do save. Cada cenário cria uma conta única e a remove ao final por Prisma; requer acesso ao `.env` e dependências do backend. O limite de login da API continua ativo, então execuções repetidas em curto intervalo podem receber 429.

Capturas de tela ficam em `test-results`, ignorado pelo Git.
