# Pokémon Simulator

Remake single-player em JavaScript com ES Modules. Frontend React 18 em `frontend/` e API Express/Prisma/MySQL em `backend/`.

Versão pública inicial: **v0.1.0**. O repositório inclui o catálogo e os sprites locais, para que o jogo funcione sem consultar a PokéAPI durante as partidas. Este é um projeto de fã, sem vínculo com Nintendo, Game Freak ou The Pokémon Company. Os dados e sprites Pokémon pertencem aos respectivos titulares; os dados de referência foram obtidos via [PokéAPI](https://pokeapi.co/).

O backend contém apenas os arquivos do projeto atual. A configuração local fica em `backend/.env`, ignorado pelo Git; `backend/.env.example` documenta as variáveis necessárias sem credenciais reais.

## Executar localmente

Clone o repositório, configure `backend/.env` a partir de `backend/.env.example` e, com Node.js 22.12+ ou 24 e MySQL 8+, abra dois terminais. Execute os comandos abaixo a partir da pasta clonada `PokemonSimulator`.

```powershell
git clone https://github.com/GustavoGmBr/PokemonSimulator.git
cd PokemonSimulator
```

Backend:

```powershell
cd backend
npm install
npm run prisma:generate
npm run db:migrate
npm run catalog:seed-moves
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Abra http://127.0.0.1:5173. O Vite encaminha `/api` e `/assets` ao backend na porta 3334. Se a porta do backend mudar, configure `API_PROXY_TARGET` no `.env` do frontend conforme `.env.example`.

## Disponível

- Cadastro e login, sessão persistente e logout.
- Tela de um save por conta: carregar ou começar uma nova jornada, com confirmação antes de substituir.
- Escolha de um inicial de qualquer geração de Kanto a Paldea no nível 5, persistida no MySQL. O novo save recebe 10 Poké Bolas e 5 Poções ao escolher o inicial.
- Menu com coleção em destaque, favoritos persistentes, filtros por número, nome, tipo, geração, shiny, forma e nível, e ordenação por captura ou força. O mercado em `/mercado` permite vender vários Pokémon capturados de uma vez, mantendo pelo menos um. A bolsa é agrupada por categoria; a loja em `/loja` permite buscar itens pelo nome e comprar diferentes itens e quantidades em um carrinho.
- Pokécassino em `/cassino`: cada ficha custa 5 ₽ e serve para jogar caça-níqueis, cartas, roleta e Voltorb Flip ou comprar Poké Bolas (incluindo Master Bola) e itens de cura. Na roleta, é possível filtrar os Pokémon da coleção por nome e valor, conferir a sprite e apostar um exemplar: ele sai da coleção em qualquer resultado, e uma vitória paga o valor de venda multiplicado em Pokédólares. Favoritos não podem ser vendidos nem apostados.
- Pokédex dos 1.025 com filtro por geração, capturados, forma shiny, sprites 2D/3D pré-renderizados e detalhes de atributos, XP, golpes e evolução. A galeria de formas mostra Normal, Mega, G-Max, Primal e fusões lado a lado com seus requisitos.
- Escolha visual de até quatro ataques por Pokémon e aba de TMs compatíveis, compradas para um exemplar específico com Pokédólares. Em batalha, cura e Poké Bolas são escolhidas por cartões com sprite e quantidade.
- Áreas separadas para selvagens e batalhas. O jogador pode procurar em qualquer região liberada ou em todas elas de uma vez. Lendários e míticos selvagens aparecem após vencer os quatro desafios finais da respectiva região; a escolha manual também respeita isso. Após derrotar o campeão de uma região, escolhe espécie e nível dos selvagens daquela região. Treinadores aleatórios e torneios usam Pokémon de todas as gerações, equilibrados pela dificuldade. Contra treinadores, desafios e torneios, é possível escolher até o mesmo número de Pokémon do adversário e alternar entre eles. Alola tem Provas Insulares e Galar tem a Copa dos Campeões.
- Perfil do treinador com insígnias e histórico de batalhas, capturas e encontros shiny. A aba Missões oferece dez objetivos renovados a cada duas horas, contagem regressiva e resgate individual ou coletivo das recompensas. Tipos usam sprites Sword/Shield da PokéAPI; os golpes mostram efetividade e a escolha de Pokémon para batalha indica vantagem, neutralidade ou desvantagem por tipo.
- Vitórias contra selvagens e desafios rendem 10 Pokédólares por nível de cada adversário derrotado. Treinadores pagam 1.000/3.000/10.000 Pokédólares e itens conforme a dificuldade, sem Master Bola. Amulet Coin dobra o dinheiro, Lucky Egg dobra XP, e Shiny Charm e Catch Charm melhoram suas chances conforme os desafios da região do Pokémon vencidos.
- Evolução pela coleção do menu, com requisitos de nível ou item. Mega Evoluções permanentes exigem nível 60 e uma pedra específica; Rayquaza usa a Mega Rayquazatrite. Regressões Primais permanentes de Groudon e Kyogre exigem nível 60 e o Orbe Vermelho ou Azul; G-Max permanente usa a Pedra G-Max universal e concede +50% de HP máximo. Esses itens são de uso único e desaparecem da bolsa ao consumir a última unidade. Necrozma pode se fundir com Solgaleo, Lunala ou ambos; Ultra Necrozma também exige a Pedra Ultra Burst de 150.000 ₽. Os parceiros permanecem na coleção. Mega Pedras custam 50.000 ₽, Orbes Primais 100.000 ₽ e a Pedra G-Max 75.000 ₽.
- Doce Raro e Doces de EXP P/M/G/GG são recompensas de torneios, não vendidos na loja. Os Doces de EXP concedem 800/3.000/10.000/30.000 XP. Capturar um selvagem concede XP como derrotá-lo. Master Bola pode ser obtida como prêmio ou com fichas no cassino, mas não é vendida na loja comum.
- Catálogo local com atributos, tipos, crescimento, evoluções, aprendizado, 781 golpes, 145 itens e sprites das 1.025 espécies de Kanto a Paldea, 97 formas Mega, 2 formas Primal, 34 formas G-Max, 3 formas de Necrozma e 18 tipos.

O jogo não consulta a PokéAPI durante a navegação. Conta, save, inventário e batalhas usam a API e o MySQL. Os sprites chamados de 3D são animações pré-renderizadas, sem câmera giratória. Johto, Hoenn, Sinnoh e Unova 1 abrem após os oito ginásios da região anterior; Unova 2 abre após Alder. Kalos exige vencer Alder e Iris; Alola, Galar e Paldea abrem após os oito desafios iniciais da região anterior. É possível escolher o inicial de qualquer uma das nove gerações ao criar o save.

## Atualizar o catálogo

O catálogo e as imagens já estão importados. Para repetir a importação:

```powershell
cd backend
npm run catalog:import
npm run catalog:seed-moves
# Para buscar novamente os dados e as imagens, ignorando o cache:
npm run catalog:import -- --refresh
```

Consulte [as instruções da API](backend/README.md), [as instruções do frontend](frontend/README.md) e [a descrição do catálogo](backend/data/README.md).
