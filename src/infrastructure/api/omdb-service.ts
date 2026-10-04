/**
 * Serviço OMDb para obter a nota do IMDb, com proteções para poupar a cota diária:
 * 0. Filmes do catálogo usam a nota publicada (public/imdb.json): zero consultas ao OMDb
 * 1. Acesso ao localStorage com guarda (funciona sem window)
 * 2. Validação do formato do IMDb ID (/^tt\d+$/) antes de qualquer chamada
 * 3. Deduplicação de chamadas em andamento para o mesmo ID
 * 4. Cache positivo (7 dias), com limpeza das entradas expiradas
 * 5. Cache negativo (24 horas) para filmes sem nota
 * 6. Pausa de 15 minutos após 429 ou 401 (chave inválida ou cota diária esgotada)
 */

import { staticImdbRating } from "../catalog/imdb-ratings";
import { isApiEnabled } from "./tmdb-client";

export interface ImdbRatingData {
  rating: string; // Ex: "7.6"
  votes?: string;  // Ex: "18,537"
}

interface CachedEntry {
  data: ImdbRatingData | null;
  timestamp: number;
}

const POSITIVE_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias para notas válidas
const NEGATIVE_CACHE_TTL_MS = 24 * 60 * 60 * 1000;     // 24 horas para filmes sem nota/N/A
const LOCAL_STORAGE_PREFIX = "cinera_imdb_cache_";
const RATE_LIMIT_LOCK_KEY = "cinera_omdb_rate_locked_until";
const IMDB_ID_PATTERN = /^tt\d+$/;

// 1. Memória em runtime
const memoryCache = new Map<string, CachedEntry>();

// 2. Map de requisições em voo para deduplicar chamadas concorrentes
const inFlightRequests = new Map<string, Promise<ImdbRatingData | null>>();

function isClientSideStorageAvailable(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      typeof window.localStorage !== "undefined" &&
      window.localStorage !== null
    );
  } catch {
    return false;
  }
}

export class OmdbService {
  /**
   * Busca a nota do IMDb pelo IMDb ID, usando os caches e a pausa descritos acima.
   */
  public static async getImdbRating(imdbId?: string | null): Promise<ImdbRatingData | null> {
    if (!imdbId) {
      return null;
    }

    const cleanId = imdbId.trim();

    // Validação estrita de formato de ID (evita chamadas inúteis)
    if (!IMDB_ID_PATTERN.test(cleanId)) {
      return null;
    }

    // Filmes do catálogo: a nota já vem publicada pelo robô, sem consulta ao OMDb
    const published = await staticImdbRating(cleanId);
    if (published) {
      return published;
    }

    if (!isApiEnabled()) {
      return null;
    }

    const now = Date.now();

    // 1. Verificação do cache em memória
    const memEntry = memoryCache.get(cleanId);
    if (memEntry) {
      const ttl = memEntry.data ? POSITIVE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;
      if (now - memEntry.timestamp < ttl) {
        return memEntry.data;
      }
      memoryCache.delete(cleanId);
    }

    // 2. Verificação de armazenamento local seguro (com auto-limpeza de expirados)
    const hasStorage = isClientSideStorageAvailable();
    if (hasStorage) {
      try {
        const cacheKey = `${LOCAL_STORAGE_PREFIX}${cleanId}`;
        const stored = window.localStorage.getItem(cacheKey);

        if (stored) {
          const parsed: CachedEntry = JSON.parse(stored);
          const ttl = parsed.data ? POSITIVE_CACHE_TTL_MS : NEGATIVE_CACHE_TTL_MS;

          if (now - parsed.timestamp < ttl) {
            memoryCache.set(cleanId, parsed);
            return parsed.data;
          }
          // Remove cache expirado para economizar espaço
          window.localStorage.removeItem(cacheKey);
        }

        // Checa se estamos em modo de proteção contra Rate Limit
        const lockUntil = window.localStorage.getItem(RATE_LIMIT_LOCK_KEY);
        if (lockUntil && Number(lockUntil) > now) {
          return null;
        }
      } catch {
        // Ignora erros de storage
      }
    }

    // 3. Deduplicação de requisições em voo (se já houver uma busca para esse ID, reutiliza a Promise)
    if (inFlightRequests.has(cleanId)) {
      return inFlightRequests.get(cleanId)!;
    }

    // 4. Executa a chamada real protegida
    const requestPromise = (async (): Promise<ImdbRatingData | null> => {
      try {
        // Pelo Worker do site, que guarda a chave do OMDb no servidor
        const response = await fetch(
          `/api/omdb?i=${encodeURIComponent(cleanId)}`,
          { signal: AbortSignal.timeout(8000) },
        );

        // Proteção contra Rate Limit (429) ou Chave Inválida/Revogada (401)
        if (response.status === 429 || response.status === 401) {
          if (hasStorage) {
            try {
              window.localStorage.setItem(
                RATE_LIMIT_LOCK_KEY,
                String(Date.now() + 15 * 60 * 1000),
              );
            } catch {
              // Ignora
            }
          }
          return null;
        }

        // Se for erro HTTP transitório do servidor (500, 502, 503, etc.), NÃO grava no cache negativo!
        // Permite que o usuário tente novamente depois sem ficar 24h bloqueado.
        if (!response.ok) {
          return null;
        }

        const json = await response.json();

        // Validação da estrutura JSON
        if (typeof json !== "object" || json === null) {
          this.saveToCache(cleanId, null, hasStorage);
          return null;
        }

        const rawRating = typeof json.imdbRating === "string" ? json.imdbRating.trim() : "";
        const isNumericRating = /^\d+(\.\d+)?$/.test(rawRating);

        if (json.Response === "False" || !isNumericRating) {
          // Cache negativo: salva como null para não re-consultar a cada render
          this.saveToCache(cleanId, null, hasStorage);
          return null;
        }

        const result: ImdbRatingData = {
          rating: rawRating,
          votes:
            json.imdbVotes && typeof json.imdbVotes === "string" && json.imdbVotes !== "N/A"
              ? json.imdbVotes.trim()
              : undefined,
        };

        this.saveToCache(cleanId, result, hasStorage);
        return result;
      } catch (error) {
        console.warn(`[OMDb] Falha segura ao obter nota IMDb para ${cleanId}:`, error);
        return null;
      } finally {
        inFlightRequests.delete(cleanId);
      }
    })();

    inFlightRequests.set(cleanId, requestPromise);
    return requestPromise;
  }

  /**
   * Grava dados de cache de forma segura na memória e no LocalStorage
   */
  private static saveToCache(
    cleanId: string,
    data: ImdbRatingData | null,
    hasStorage: boolean,
  ): void {
    const entry: CachedEntry = {
      data,
      timestamp: Date.now(),
    };

    memoryCache.set(cleanId, entry);

    if (hasStorage) {
      try {
        window.localStorage.setItem(
          `${LOCAL_STORAGE_PREFIX}${cleanId}`,
          JSON.stringify(entry),
        );
      } catch {
        // Ignora quota de storage excedida
      }
    }
  }
}