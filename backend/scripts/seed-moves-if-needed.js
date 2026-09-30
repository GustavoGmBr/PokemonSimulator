import '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

let needsSeed;
try {
  const [moves, speciesMoves] = await Promise.all([
    prisma.golpeBatalha.count(),
    prisma.especieAtaque.count(),
  ]);
  needsSeed = moves === 0 || speciesMoves === 0;
} finally {
  await prisma.$disconnect();
}

if (needsSeed) {
  console.log('Primeira execução: cadastrando golpes das espécies...');
  await import('./seed-moves.js');
} else {
  console.log('Golpes já cadastrados no banco.');
}
