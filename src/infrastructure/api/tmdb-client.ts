const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const globalProcessEnv = (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env;
const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (globalProcessEnv || {});
const API_TOKEN = env.VITE_TMDB_API_TOKEN;
const API_KEY = env.VITE_TMDB_API_KEY;

/**
 * Indica se existem credenciais da API do TMDB configuradas no ambiente.
 */
export const isTmdbConfigured = (): boolean => Boolean(API_TOKEN || API_KEY);

/**
 * Função utilitária para obter o URL do cartaz do filme no TMDB.
 */
export const getPosterUrl = (
  path: string | null,
  size: 'w342' | 'w500' | 'w780' = 'w500'
): string => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Função utilitária para obter o URL do backdrop (imagem de fundo) do filme no TMDB.
 */
export const getBackdropUrl = (
  path: string | null,
  size: 'w780' | 'w1280' | 'original' = 'original'
): string => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Função utilitária para obter o URL da foto de perfil de membros do elenco ou equipe no TMDB.
 */
export const getProfileUrl = (
  path: string | null,
  size: 'w185' | 'h632' = 'w185'
): string => {
  if (!path) return '';
  return `https://image.tmdb.org/t/p/${size}${path}`;
};

/**
 * Executa requisições autenticadas para a API do TMDB.
 */
export async function fetchFromTMDB<T>(pathWithQuery: string, signal?: AbortSignal): Promise<T> {
  const separator = pathWithQuery.includes('?') ? '&' : '?';
  let fullUrl = `${TMDB_BASE_URL}${pathWithQuery}`;

  const headers: HeadersInit = {
    accept: 'application/json',
  };

  if (API_TOKEN) {
    headers.Authorization = `Bearer ${API_TOKEN}`;
  } else if (API_KEY) {
    fullUrl += `${separator}api_key=${API_KEY}`;
  }

  const response = await fetch(fullUrl, { headers, signal });
  if (!response.ok) {
    throw new Error(
      `Erro na chamada da API TMDB (${response.status}): ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
