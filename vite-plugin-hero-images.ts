import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { heroPreloadAttrs } from './src/features/hero/hero-image.ts'

/**
 * Fotos do destaque em AVIF, geradas no build.
 *
 * A TMDB só entrega JPEG, e a única versão nítida o bastante é a `original` (3840 px, de 0,6 a 1,5 MB por foto). Aqui o build
 * baixa as originais das fotos do destaque do dia (as 5 de public/catalog.json), recodifica em AVIF (~260 KB cada, quase
 * indistinguível) e as publica no próprio domínio, em /hero/<nome>.<hash>.avif (o hash no nome permite cache de 1 ano).
 * Uma foto só serve todos os aparelhos: não há mais `srcset` para o navegador escolher mal.
 *
 * O app lê quais fotos existem pelo módulo virtual `virtual:hero-images` (caminho da TMDB -> endereço do AVIF), e o
 * index.html ganha um <link rel="preload"> da primeira foto, lida do catálogo do dia. O catálogo e o index.html saem no mesmo
 * deploy (o robô commita o catálogo e o Cloudflare publica de novo), então combinam.
 *
 * Nunca derruba o build: se uma foto não puder ser baixada ou codificada, o build AVISA e essa foto fica no plano B
 * (o JPEG da TMDB, veja features/hero/hero-image.ts). `CINERA_HERO_AVIF=off` desliga a geração (útil sem rede).
 * No `npm run dev` nada é gerado: o plano B vale.
 */

const VIRTUAL_ID = 'virtual:hero-images'
const RESOLVED_ID = `\0${VIRTUAL_ID}`

/** Qualidade do AVIF (0 a 100). Nas 5 fotos de teste: 45 deu ~197 KB e ficou liso demais; 50 deu ~260 KB; 55 passa de 330 KB. */
const AVIF_QUALITY = 50
const MAX_ORIGINAL_BYTES = 20 * 1024 * 1024
/** Só caminhos simples de imagem da TMDB (ex.: /abc123.jpg): o endereço da original é montado com este texto. */
const BACKDROP_PATH = /^\/[A-Za-z0-9_-]+\.(?:jpg|jpeg|png)$/

export interface HeroImagesOptions {
  catalogPath: string
  /** Onde guardar os AVIF já gerados, para os builds seguintes não baixarem tudo de novo. */
  cacheDir?: string
  /** Trocam o download e a codificação nos testes. */
  fetchOriginal?: (url: string) => Promise<Uint8Array>
  encode?: (original: Uint8Array) => Promise<Uint8Array>
}

async function downloadOriginal(url: string): Promise<Uint8Array> {
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const bytes = new Uint8Array(await response.arrayBuffer())
  if (bytes.length === 0 || bytes.length > MAX_ORIGINAL_BYTES) throw new Error(`tamanho inesperado (${bytes.length} bytes)`)
  return bytes
}

async function encodeAvif(original: Uint8Array): Promise<Uint8Array> {
  // Importado só aqui: o sharp é nativo e pesado, e o dev server e os testes não precisam dele.
  const { default: sharp } = await import('sharp')
  return sharp(original).avif({ quality: AVIF_QUALITY, effort: 4 }).toBuffer()
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error))

export function heroImages(options: HeroImagesOptions): Plugin {
  const fetchOriginal = options.fetchOriginal ?? downloadOriginal
  const encode = options.encode ?? encodeAvif
  const images = new Map<string, { url: string; fileName: string; source: Uint8Array }>() // caminho da TMDB -> AVIF gerado
  let command = 'serve'
  let log = { info: (message: string) => console.info(message), warn: (message: string) => console.warn(message) }

  /** Lê as fotos de fundo do destaque no catálogo do dia (sempre do arquivo: no dev ele pode mudar com o servidor aberto). */
  function readHeroPaths(): { paths: string[]; problem: string | null } {
    try {
      const catalog = JSON.parse(readFileSync(options.catalogPath, 'utf-8')) as { hero?: { backdropPath?: string | null }[] }
      const paths = (catalog?.hero ?? []).map((movie) => movie?.backdropPath).filter((path): path is string => typeof path === 'string' && path.length > 0)
      return { paths, problem: paths.length > 0 ? null : 'o catálogo não tem destaque com foto de fundo' }
    } catch (error) {
      return { paths: [], problem: `não consegui ler ${options.catalogPath} (${reason(error)})` }
    }
  }

  async function generate(backdropPath: string) {
    if (!BACKDROP_PATH.test(backdropPath)) {
      log.warn(`[cinera-hero-images] caminho de foto fora do padrão, ignorado: ${backdropPath}`)
      return
    }

    try {
      const name = backdropPath.slice(1).replace(/\.\w+$/, '')
      const cacheFile = options.cacheDir ? join(options.cacheDir, `${name}.q${AVIF_QUALITY}.avif`) : null

      let avif: Uint8Array
      if (cacheFile && existsSync(cacheFile)) {
        avif = readFileSync(cacheFile)
      } else {
        const original = await fetchOriginal(`https://image.tmdb.org/t/p/original${backdropPath}`)
        avif = await encode(original)
        if (avif.length === 0) throw new Error('a codificação devolveu um arquivo vazio')
        if (cacheFile && options.cacheDir) {
          mkdirSync(options.cacheDir, { recursive: true })
          writeFileSync(cacheFile, avif)
        }
      }

      const hash = createHash('sha256').update(avif).digest('hex').slice(0, 8)
      const fileName = `hero/${name}.${hash}.avif`
      images.set(backdropPath, { url: `/${fileName}`, fileName, source: avif })
    } catch (error) {
      log.warn(`[cinera-hero-images] não consegui gerar o AVIF de ${backdropPath}; essa foto fica no plano B, o JPEG da TMDB (${reason(error)})`)
    }
  }

  return {
    name: 'cinera-hero-images',

    configResolved(config) {
      command = config.command
      log = { info: (message) => config.logger.info(message), warn: (message) => config.logger.warn(message) }
    },

    async buildStart() {
      if (command !== 'build') return
      if (process.env.CINERA_HERO_AVIF === 'off') {
        log.info('[cinera-hero-images] geração desligada por CINERA_HERO_AVIF=off; as fotos do destaque ficam no plano B')
        return
      }

      const { paths } = readHeroPaths()
      await Promise.all(paths.map(generate))
      if (paths.length > 0) {
        const kb = Math.round([...images.values()].reduce((sum, image) => sum + image.source.length, 0) / 1024)
        log.info(`[cinera-hero-images] ${images.size} de ${paths.length} fotos do destaque em AVIF (${kb} KB no total)`)
      }
    },

    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : null
    },

    load(id) {
      if (id !== RESOLVED_ID) return null
      return `export default ${JSON.stringify(Object.fromEntries([...images].map(([path, image]) => [path, image.url])))}`
    },

    generateBundle() {
      for (const image of images.values()) {
        this.emitFile({ type: 'asset', fileName: image.fileName, source: image.source })
      }
    },

    transformIndexHtml() {
      const { paths, problem } = readHeroPaths()
      const first = paths[0]
      const attrs = heroPreloadAttrs(first, first ? images.get(first)?.url : undefined)

      if (!attrs) {
        log.warn(`[cinera-hero-images] o index.html fica sem o preload da foto do destaque: ${problem ?? 'o catálogo não tem destaque com foto de fundo'}`)
        return []
      }

      return [{ tag: 'link', attrs, injectTo: 'head' as const }]
    },
  }
}
