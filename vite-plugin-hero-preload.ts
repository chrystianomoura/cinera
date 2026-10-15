import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { heroPreloadAttrs } from './src/features/hero/hero-image'

/**
 * Coloca no index.html um <link rel="preload"> da primeira foto do destaque, lida do catálogo do dia (public/catalog.json).
 * Sem isso a foto só começava a baixar depois do JavaScript, do React e do catalog.json; com o preload ela baixa em paralelo.
 * O catálogo e o index.html saem no mesmo deploy (o robô commita o catálogo e o Cloudflare publica de novo), então combinam.
 *
 * Se não der para montar o preload (catálogo ilegível ou sem destaque), o build NÃO falha, mas avisa no registro do build:
 * perder o preload só deixa o site mais lento, não o quebra, e um aviso é melhor que sumir em silêncio.
 * O teste ponta a ponta e2e/preload-destaque.spec.ts confere o index.html que realmente sai do build.
 */
export function heroPreload(catalogPath: string): Plugin {
  let warn: (message: string) => void = (message) => console.warn(message)

  return {
    name: 'cinera-hero-preload',
    configResolved(config) {
      warn = (message) => config.logger.warn(message)
    },
    transformIndexHtml() {
      const skip = (reason: string) => {
        warn(`[cinera-hero-preload] o index.html fica sem o preload da foto do destaque: ${reason}`)
        return []
      }

      let catalog: { hero?: { backdropPath?: string | null }[] } | null
      try {
        catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
      } catch (error) {
        return skip(`não consegui ler ${catalogPath} (${error instanceof Error ? error.message : String(error)})`)
      }

      const attrs = heroPreloadAttrs(catalog?.hero?.[0]?.backdropPath)
      if (!attrs) return skip('o catálogo não tem destaque com foto de fundo')

      return [{ tag: 'link', attrs, injectTo: 'head' as const }]
    },
  }
}
