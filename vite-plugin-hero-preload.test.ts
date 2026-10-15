import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ResolvedConfig } from 'vite'
import { heroPreload } from './vite-plugin-hero-preload'

const PATH = '/3icyRAqgakNcQn6aDVz9libFmBA.jpg'

let dir: string
beforeEach(() => void (dir = mkdtempSync(join(tmpdir(), 'cinera-preload-'))))
afterEach(() => rmSync(dir, { recursive: true, force: true }))

/** Roda o plugin como o Vite roda: primeiro configResolved (com um registro de mentira), depois transformIndexHtml. */
function run(catalogPath: string) {
  const warnings: string[] = []
  const plugin = heroPreload(catalogPath)
  ;(plugin.configResolved as (config: ResolvedConfig) => void)({ logger: { warn: (m: string) => warnings.push(m) } } as unknown as ResolvedConfig)
  const tags = (plugin.transformIndexHtml as () => unknown[])()
  return { tags, warnings }
}

function catalogWith(content: string) {
  const file = join(dir, 'catalog.json')
  writeFileSync(file, content)
  return file
}

describe('preload da foto do destaque (build)', () => {
  it('com destaque no catálogo, gera um <link rel="preload"> da primeira foto e não avisa nada', () => {
    const { tags, warnings } = run(catalogWith(JSON.stringify({ hero: [{ backdropPath: PATH }, { backdropPath: '/outra.jpg' }] })))

    expect(warnings).toEqual([])
    expect(tags).toEqual([
      {
        tag: 'link',
        injectTo: 'head',
        attrs: expect.objectContaining({ rel: 'preload', as: 'image', href: `https://image.tmdb.org/t/p/w1280${PATH}`, fetchpriority: 'high' }),
      },
    ])
  })

  it('catálogo que não existe: não gera nada e AVISA (não falha o build, mas também não some em silêncio)', () => {
    const { tags, warnings } = run(join(dir, 'nao-existe.json'))

    expect(tags).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('não consegui ler')
  })

  it('JSON quebrado: não gera nada e avisa', () => {
    const { tags, warnings } = run(catalogWith('{ isto não é json'))

    expect(tags).toEqual([])
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toContain('não consegui ler')
  })

  it('sem destaque, ou com destaque sem foto de fundo: não gera nada e avisa', () => {
    for (const content of [JSON.stringify({ rows: [] }), JSON.stringify({ hero: [] }), JSON.stringify({ hero: [{ backdropPath: null }] })]) {
      const { tags, warnings } = run(catalogWith(content))

      expect(tags).toEqual([])
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('não tem destaque')
    }
  })
})
