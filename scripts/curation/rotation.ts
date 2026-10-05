// Rotação diária das fileiras estáveis: o núcleo fica fixo e uma janela da reserva avança com a data.
// Sem arquivo de estado: o resultado depende só da data, então é reproduzível e não quebra se um dia falhar.

const DAY_MS = 86_400_000;
/** Brasília (UTC-3): o "dia" do catálogo vira à meia-noite daqui */
const BRASILIA_OFFSET_MS = 3 * 3_600_000;

/** Dias desde 1970 no fuso de Brasília. `CATALOG_DATE=AAAA-MM-DD` força um dia (para testes). */
export function dayIndex(date: string | undefined = process.env.CATALOG_DATE): number {
  if (date) return Math.floor(Date.parse(`${date}T12:00:00Z`) / DAY_MS);
  return Math.floor((Date.now() - BRASILIA_OFFSET_MS) / DAY_MS);
}

/** Embaralhamento determinístico de 32 bits: mesma entrada, mesma saída, sem estado. */
function hash(id: number, turn: number): number {
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(turn + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return (h ^ (h >>> 15)) >>> 0;
}

/**
 * Rotação em faixas: a reserva (já ordenada do melhor para o pior) é dividida em `size` faixas e cada
 * posição da lista é sempre preenchida por um filme da sua faixa. Assim a curva de qualidade é a mesma
 * todo dia (a posição 12 nunca vira um filme muito pior que o da posição 11). Dentro da faixa, o filme
 * muda a cada `periodDays` dias e as faixas viram em dias diferentes, então só uma fração das posições
 * muda por dia.
 * A escolha dentro da faixa é por sorteio determinístico a partir do ID do filme (nunca repete o filme do
 * turno anterior). Por isso uma pequena mudança na fila (um filme que entra ou sai) altera só algumas
 * posições, em vez de embaralhar a lista toda como aconteceria escolhendo por índice.
 */
export function rotateLanes<T>(items: T[], size: number, periodDays: number, day: number, idOf: (item: T) => number): T[] {
  if (items.length <= size) return items;
  const laneSize = Math.floor(items.length / size);
  return Array.from({ length: size }, (_, lane) => {
    const start = lane * laneSize;
    // A última faixa absorve o resto da divisão
    const members = items.slice(start, lane === size - 1 ? items.length : start + laneSize);
    if (members.length === 1) return members[0];
    const turn = Math.floor((day + lane) / periodDays);
    const best = (pool: T[], t: number) => pool.reduce((top, m) => (hash(idOf(m), t + lane * 7919) > hash(idOf(top), t + lane * 7919) ? m : top));
    // Escolha do turno t sem repetir a do turno anterior; a cadeia recua só alguns turnos para que a
    // lista não dependa de todo o histórico (e continue estável quando a fila muda um pouco)
    const pickAt = (t: number, depth: number): T =>
      depth === 0 ? best(members, t) : best(members.filter((m) => m !== pickAt(t - 1, depth - 1)), t);
    return pickAt(turn, 4);
  });
}

/**
 * Giro do núcleo: divide a lista em blocos de `blockSize` (os 5 melhores, depois os 5 seguintes...) e gira
 * cada bloco uma posição por dia. O conjunto de cada bloco não muda, então o nível por posição se mantém
 * (o 10º nunca vira o 1º), mas todos têm a sua vez de abrir a fileira.
 */
export function rotateBlocks<T>(items: T[], blockSize: number, day: number): T[] {
  const result: T[] = [];
  for (let start = 0; start < items.length; start += blockSize) {
    const block = items.slice(start, start + blockSize);
    const shift = (((day % block.length) + block.length) % block.length);
    result.push(...block.slice(shift), ...block.slice(0, shift));
  }
  return result;
}

/** Quantos filmes do topo de cada fileira trocam de lugar todo dia, e em blocos de quantos */
export const TOP_SIZE = 10;
export const TOP_BLOCK = 5;

/** Embaralha só o topo da fileira (os `TOP_SIZE` primeiros, em blocos do mesmo nível); o resto fica como está. */
export function rotateTop<T>(items: T[], day: number): T[] {
  return [...rotateBlocks(items.slice(0, TOP_SIZE), TOP_BLOCK, day), ...items.slice(TOP_SIZE)];
}
