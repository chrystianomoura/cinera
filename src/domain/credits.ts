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
