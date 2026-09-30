# Catálogo local

O arquivo `catalogo.json` contém as 1.025 espécies de Kanto a Paldea, formas Mega, Primal, G-Max e fusões, 781 golpes, 145 itens e os 18 tipos. A fonte dos metadados e dos endereços originais de sprites é a [PokéAPI v2](https://pokeapi.co/docs/v2).

Os sprites ficam em `backend/public/pokemon`, `backend/public/items` e `backend/public/types`. O catálogo aponta para esses arquivos locais, então o jogo não depende da PokéAPI durante a navegação. O MySQL armazena contas, saves, golpes preparados e Pokémon capturados; as definições das espécies permanecem neste JSON.

`npm run catalog:import` recria o catálogo e baixa sprites ausentes, usando o cache em `backend/.cache/pokeapi`. A opção `-- --refresh` baixa novamente dados e imagens. Depois da importação, rode `npm run catalog:seed-moves` e reinicie a API. Os sprites e dados Pokémon pertencem aos respectivos titulares; este projeto não é afiliado a eles.
