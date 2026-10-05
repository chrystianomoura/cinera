/** O site nunca fala com o TMDB direto: passa pelo Worker (/api/tmdb), que guarda a chave no servidor. */
const API_BASE_URL = '/api/tmdb';

/**
 * Indica se o app usa a API. Só o modo de demonstração (VITE_DEMO_MODE=true) a desliga e usa filmes de exemplo.
 */
export const isApiEnabled = (): boolean => import.meta.env.VITE_DEMO_MODE !== 'true';

/**
 * Função utilitária para obter o URL do cartaz do filme no TMDB.
 */
export const getPosterUrl = (
  path: string | null,
  size: 'w185' | 'w342' | 'w500' | 'w780' = 'w500'
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
 * Executa requisições à API do TMDB pelo Worker do próprio site.
 */
export async function fetchFromTMDB<T>(pathWithQuery: string, signal?: AbortSignal): Promise<T> {
  const headers: HeadersInit = {
    accept: 'application/json',
  };

  // Timeout interno protetivo de 10s para impedir requisições zumbis congelando a UI
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(`${API_BASE_URL}${pathWithQuery}`, { headers, signal: controller.signal });
    if (!response.ok) {
      throw new Error(
        `Erro na chamada da API TMDB (${response.status}): ${response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeoutId);
  }
}
