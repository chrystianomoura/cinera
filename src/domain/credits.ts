/**
 * Representa um membro do elenco (ator/atriz) de um filme.
 */
export interface CastMember {
  id: number;
  name: string;
  character: string;
  profilePath: string | null;
  order: number;
}

/**
 * Representa um membro da equipe técnica (direção, produção, edição, etc) de um filme.
 */
export interface CrewMember {
  id: number;
  name: string;
  job: string;
  department: string;
  profilePath: string | null;
}

/**
 * Agrupa os créditos de um filme, divididos entre elenco principal e equipe técnica.
 */
export interface MovieCredits {
  id: number;
  cast: CastMember[];
  crew: CrewMember[];
  directors?: string[];
}

/** Quantos atores o carrossel do elenco mostra no máximo */
const MAX_DISPLAYED_CAST = 18;

/**
 * Os atores que a ficha realmente mostra: só os que têm foto, no máximo 18. É a regra única do carrossel do elenco e da
 * decisão de exibir ou não a seção (e a linha que a separa da anterior): as duas precisam concordar, senão sobra uma
 * seção vazia quando há atores na lista mas nenhum com foto.
 */
export function getDisplayCast(cast?: CastMember[] | null): CastMember[] {
  return (cast ?? []).filter((actor) => Boolean(actor.profilePath)).slice(0, MAX_DISPLAYED_CAST);
}
