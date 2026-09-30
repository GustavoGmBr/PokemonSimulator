import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getCatalogo, criarDadosInicial, getDetalhesEspecie } from '../src/services/catalogo.js';

test('catalogo local tem os 1025 IDs de Kanto a Paldea, sprites e golpes resolvidos', () => {
  const catalogo = getCatalogo();
  assert.deepEqual(catalogo.pokemon.map((entry) => entry.id), Array.from({ length: 1025 }, (_, i) => i + 1));
  const moveNames = new Set(catalogo.golpes.map((entry) => entry.nome));
  assert.equal(moveNames.size, catalogo.golpes.length);
  for (const pokemon of catalogo.pokemon) {
    for (const variant of ['front', 'back', 'artwork', 'frontShiny', 'backShiny', 'artworkShiny', 'home', 'homeShiny', 'animated', 'animatedShiny', 'animatedBack', 'animatedBackShiny']) assert.ok(pokemon.sprites[variant]);
    assert.equal(Object.keys(pokemon.atributosBase).length, 6);
    assert.ok(pokemon.tipos.length >= 1 && pokemon.tipos.length <= 2);
    assert.equal(pokemon.experienciaPorNivel.length, 100);
    for (const move of pokemon.golpesAprendidos) assert.ok(moveNames.has(move.golpe));
    for (const sprite of Object.values(pokemon.sprites)) {
      const buffer = readFileSync(new URL(`../public/${sprite.replace('/assets/', '')}`, import.meta.url));
      if (sprite.endsWith('.gif')) assert.match(buffer.subarray(0, 6).toString(), /^GIF8[79]a$/);
      else assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    }
    for (const form of pokemon.formasMega) {
      assert.ok(form.itemId && form.tipos.length && Object.keys(form.atributosBase).length === 6);
      for (const sprite of Object.values(form.sprites)) assert.ok(readFileSync(new URL(`../public/${sprite.replace('/assets/', '')}`, import.meta.url)).length > 8);
    }
    for (const form of pokemon.formasPrimal) {
      assert.ok(form.itemId && form.tipos.length && Object.keys(form.atributosBase).length === 6);
      for (const sprite of Object.values(form.sprites)) assert.ok(readFileSync(new URL(`../public/${sprite.replace('/assets/', '')}`, import.meta.url)).length > 8);
    }
  }
  assert.equal(catalogo.pokemon.reduce((sum, species) => sum + species.formasMega.length, 0), 97);
  assert.equal(catalogo.pokemon.reduce((sum, species) => sum + species.formasPrimal.length, 0), 2);
  assert.equal(catalogo.pokemon.reduce((sum, species) => sum + species.formasGmax.length, 0), 34);
  for (const id of [150, 380, 381, 384, 485, 491, 658, 719, 807, 870, 970]) assert.ok(catalogo.pokemon[id - 1].formasMega.length > 0);
  assert.equal(catalogo.pokemon[381].formasPrimal[0].nome, 'kyogre-primal');
  assert.equal(catalogo.pokemon[382].formasPrimal[0].nome, 'groudon-primal');
  assert.deepEqual(catalogo.pokemon[799].formasFusao.map((form) => form.nome), ['necrozma-dusk', 'necrozma-dawn', 'necrozma-ultra']);
  for (const form of catalogo.pokemon[799].formasFusao) for (const sprite of Object.values(form.sprites)) assert.ok(readFileSync(new URL(`../public/${sprite.replace('/assets/', '')}`, import.meta.url)).length > 8);
  for (const species of catalogo.pokemon) for (const form of species.formasGmax) for (const sprite of Object.values(form.sprites)) assert.ok(readFileSync(new URL(`../public/${sprite.replace('/assets/', '')}`, import.meta.url)).length > 8);
});

test('itens e Mega Pedras tem sprites locais e detalhes de golpes mantem poder', () => {
  assert.equal(getCatalogo().itens.length, 145);
  assert.equal(getCatalogo().itens.find((item) => item.nome === 'ultra-burst-stone').precoLoja, 150000);
  for (const id of ['master-ball', 'rare-candy', 'exp-candy-p', 'exp-candy-m', 'exp-candy-g', 'exp-candy-gg']) assert.equal(getCatalogo().itens.find((item) => item.nome === id).precoLoja, null);
  assert.equal(getCatalogo().itens.find((item) => item.nome === 'gmax-stone').precoLoja, 75000);
  assert.equal(getCatalogo().itens.find((item) => item.nome === 'charizardite-x').precoLoja, 50000);
  assert.equal(getCatalogo().itens.find((item) => item.nome === 'shiny-charm').precoLoja, 150000);
  for (const type of getCatalogo().tipos) for (const sprite of Object.values(type.sprites)) assert.equal(readFileSync(new URL(`../public/${sprite.replace('/assets/', '')}`, import.meta.url)).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  for (const item of getCatalogo().itens) {
    assert.ok(item.nomeExibicao && item.descricao && item.categoria);
    const buffer = readFileSync(new URL(`../public/${item.sprite.replace('/assets/', '')}`, import.meta.url));
    if (item.sprite.endsWith('.svg')) assert.match(buffer.toString(), /<svg/);
    else assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  }
  const tackle = getDetalhesEspecie(1).golpesAprendidos.find((move) => move.golpe === 'tackle');
  assert.equal(tackle.tipo, 'normal');
  assert.equal(tackle.categoria, 'physical');
  assert.ok(tackle.poder > 0 && tackle.pp > 0);
  assert.ok(getDetalhesEspecie(152).golpesAprendidos.length > 0);
  assert.ok(getDetalhesEspecie(252).golpesAprendidos.length > 0);
  assert.ok(getDetalhesEspecie(387).golpesAprendidos.length > 0);
  assert.ok(getDetalhesEspecie(495).golpesAprendidos.length > 0);
  for (const id of [650, 722, 810, 906, 1025]) assert.ok(getDetalhesEspecie(id).golpesAprendidos.length > 0);
  assert.throws(() => getDetalhesEspecie(1026), { status: 404 });
});

test('iniciais possuem nivel 5, HP cheio, experiencia e golpes aprendidos ate esse nivel', () => {
  for (const id of [1, 4, 7, 152, 155, 158, 252, 255, 258, 387, 390, 393, 495, 498, 501, 650, 653, 656, 722, 725, 728, 810, 813, 816, 906, 909, 912]) {
    const initial = criarDadosInicial(id);
    assert.equal(initial.nivel, 5);
    assert.equal(initial.hpAtual, initial.atributos.hp);
    assert.equal(initial.experiencia, 135);
    assert.ok(initial.hpAtual >= 19);
    assert.ok(initial.golpes.length >= 1 && initial.golpes.length <= 4);
    for (const move of initial.golpes) {
      assert.ok(getCatalogo().golpes.find((entry) => entry.nome === move.nome && entry.poder > 0));
      assert.equal(move.ppAtual, undefined);
    }
  }
});
