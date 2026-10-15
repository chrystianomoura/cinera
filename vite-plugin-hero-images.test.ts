import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { ResolvedConfig } from 'vite'
import { heroImages, type HeroImagesOptions } from './vite-plugin-hero-images.ts'

const A = '/aaaa1111.jpg'
const B = '/bbbb2222.jpg'
const VIRTUAL = 'virtual:hero-images'
const bytes = (text: string) => new TextEncoder().encode(text)
const text = (data: Uint8Array) => new TextDecoder().decode(data)

let dir: string
let previousSwitch: string | undefined
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'cinera-hero-'))
  previousSwitch = process.env.CINERA_HERO_AVIF
  delete process.env.CINERA_HERO_AVIF
})
afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
  if (previousSwitch === undefined) delete process.env.CINERA_HERO_AVIF
  else process.env.CINERA_HERO_AVIF = previousSwitch
})

/** Monta o plugin como o Vite o monta, com download e codificação de mentira (sem rede e sem sharp). */
function setup(catalog: unknown, overrides: Partial<HeroImagesOptions> = {}, command: 'build' | 'serve' = 'build') {
  const catalogPath = join(dir, 'catalog.json')
  writeFileSync(catalogPath, typeof catalog === 'string' ? catalog : JSON.stringify(catalog))

  const warnings: string[] = []
  const infos: string[] = []
  const fetched: string[] = []
  const plugin = heroImages({
    catalogPath,
    cacheDir: join(dir, 'cache'),
    fetchOriginal: async (url) => {
      fetched.push(url)
      return bytes(`original:${url}`)
    },
    encode: async (original) => bytes(`avif:${text(original)}`),
    ...overrides,
  })
  const config = { command, logger: { info: (m: string) => infos.push(m), warn: (m: string) => warnings.push(m) } }
  ;(plugin.configResolved as (config: ResolvedConfig) => void)(config as unknown as ResolvedConfig)

  return {
    plugin,
    warnings,
    infos,
    fetched,
    buildStart: () => (plugin.buildStart as () => Promise<void>)(),
    html: () => (plugin.transformIndexHtml as unknown as () => { attrs: Record<string, string> }[])(),
    moduleCode: () => (plugin.load as (id: string) => string | null)('\0' + VIRTUAL),
    emitted: () => {
      const files: { fileName: string; source: Uint8Array }[] = []
      ;(plugin.generateBundle as unknown as (this: { emitFile: (file: { fileName: string; source: Uint8Array }) => void }) => void).call({ emitFile: (file) => files.push(file) })
      return files
    },
  }
}

const heroes = (...paths: (string | null)[]) => ({ hero: paths.map((backdropPath) => ({ backdropPath })) })

describe('fotos do destaque em AVIF (build)', () => {
  it('gera um AVIF por foto do destaque, publica em /hero/<nome>.<hash>.avif e expõe o mapa ao app', async () => {
    const t = setup(heroes(A, B))
    await t.buildStart()

    expect([...t.fetched].sort()).toEqual([`https://image.tmdb.org/t/p/original${A}`, `https://image.tmdb.org/t/p/original${B}`])
    expect(t.warnings).toEqual([])
    expect(t.infos.join(' ')).toContain('2 de 2 fotos do destaque em AVIF')

    const files = t.emitted()
    expect(files.map((f) => f.fileName).sort()).toEqual([expect.stringMatching(/^hero\/aaaa1111\.[0-9a-f]{8}\.avif$/), expect.stringMatching(/^hero\/bbbb2222\.[0-9a-f]{8}\.avif$/)])
    expect(text(files[0].source).startsWith('avif:original:https://image.tmdb.org/')).toBe(true)

    const code = t.moduleCode() ?? ''
    expect(code).toMatch(/^export default \{/)
    expect(JSON.parse(code.replace('export default ', ''))).toEqual({
      [A]: expect.stringMatching(/^\/hero\/aaaa1111\.[0-9a-f]{8}\.avif$/),
      [B]: expect.stringMatching(/^\/hero\/bbbb2222\.[0-9a-f]{8}\.avif$/),
    })
  })

  it('resolve só o módulo virtual do plugin', () => {
    const { plugin, moduleCode } = setup(heroes(A))

    expect((plugin.resolveId as (id: string) => string | null)(VIRTUAL)).toBe('\0' + VIRTUAL)
    expect((plugin.resolveId as (id: string) => string | null)('react')).toBeNull()
    expect((plugin.load as (id: string) => string | null)('outro-modulo')).toBeNull()
    expect(moduleCode()).toBe('export default {}') // antes do build gerar algo, o mapa está vazio
  })

  it('o preload é da primeira foto, em AVIF do próprio domínio, e bate com o arquivo publicado', async () => {
    const t = setup(heroes(A, B))
    await t.buildStart()

    const [tag] = t.html()
    expect(t.warnings).toEqual([])
    expect(tag.attrs).toMatchObject({ rel: 'preload', as: 'image', type: 'image/avif', fetchpriority: 'high' })
    const published = t.emitted().find((file) => file.fileName.includes('aaaa1111'))?.fileName
    expect(published).toBeTruthy()
    expect(tag.attrs.href).toBe(`/${published}`)
    expect(tag.attrs).not.toHaveProperty('imagesrcset')
  })

  it('o segundo build reaproveita o cache: não baixa nem codifica de novo, e o endereço é o mesmo', async () => {
    const first = setup(heroes(A, B))
    await first.buildStart()
    const second = setup(heroes(A, B))
    await second.buildStart()

    expect(first.fetched).toHaveLength(2)
    expect(second.fetched).toEqual([])
    expect(second.moduleCode()).toBe(first.moduleCode())
  })

  it('se uma foto não baixa: AVISA, essa foto fica no plano B (JPEG da TMDB) e a outra segue normalmente', async () => {
    const t = setup(heroes(A, B), {
      fetchOriginal: async (url) => {
        if (url.endsWith(A)) throw new Error('HTTP 503')
        return bytes('original')
      },
    })
    await t.buildStart()

    expect(t.warnings).toHaveLength(1)
    expect(t.warnings[0]).toContain(`não consegui gerar o AVIF de ${A}`)
    expect(t.warnings[0]).toContain('HTTP 503')
    expect(t.warnings[0]).toContain('plano B')
    expect(JSON.parse((t.moduleCode() ?? '').replace('export default ', ''))).toEqual({ [B]: expect.stringContaining('/hero/bbbb2222.') })
    expect(t.emitted()).toHaveLength(1)

    // a 1ª foto não tem AVIF: o preload cai no plano B, com a mesma lista do <img>
    const [tag] = t.html()
    expect(tag.attrs).toMatchObject({ rel: 'preload', as: 'image', href: `https://image.tmdb.org/t/p/w1280${A}` })
    expect(tag.attrs.imagesrcset).toContain(`/t/p/original${A} 3840w`)
    expect(tag.attrs).not.toHaveProperty('type')
  })

  it('codificação que devolve arquivo vazio conta como falha', async () => {
    const t = setup(heroes(A), { encode: async () => new Uint8Array() })
    await t.buildStart()

    expect(t.warnings[0]).toContain('arquivo vazio')
    expect(t.emitted()).toEqual([])
  })

  it('caminho de foto fora do padrão nunca vira endereço baixado', async () => {
    const t = setup(heroes('/../../etc/passwd', 'https://outro.site/x.jpg'))
    await t.buildStart()

    expect(t.fetched).toEqual([])
    expect(t.warnings).toHaveLength(2)
    expect(t.warnings[0]).toContain('fora do padrão')
  })

  it('no dev (serve) não baixa nem gera nada: o mapa fica vazio e vale o plano B', async () => {
    const t = setup(heroes(A), {}, 'serve')
    await t.buildStart()

    expect(t.fetched).toEqual([])
    expect(t.moduleCode()).toBe('export default {}')
    expect(t.html()[0].attrs.href).toBe(`https://image.tmdb.org/t/p/w1280${A}`)
  })

  it('CINERA_HERO_AVIF=off desliga a geração e diz isso no registro do build', async () => {
    process.env.CINERA_HERO_AVIF = 'off'
    const t = setup(heroes(A))
    await t.buildStart()

    expect(t.fetched).toEqual([])
    expect(t.infos.join(' ')).toContain('CINERA_HERO_AVIF=off')
  })
})

describe('catálogo que não dá para usar: o build não falha, mas avisa', () => {
  it('arquivo que não existe', () => {
    const t = setup(heroes(A), { catalogPath: join(dir, 'nao-existe.json') })

    expect(t.html()).toEqual([])
    expect(t.warnings).toHaveLength(1)
    expect(t.warnings[0]).toContain('não consegui ler')
  })

  it('JSON quebrado', () => {
    const t = setup('{ isto não é json')

    expect(t.html()).toEqual([])
    expect(t.warnings[0]).toContain('não consegui ler')
  })

  it('sem destaque, ou com destaque sem foto de fundo', () => {
    for (const catalog of [{ rows: [] }, { hero: [] }, heroes(null)]) {
      const t = setup(catalog)

      expect(t.html()).toEqual([])
      expect(t.warnings).toHaveLength(1)
      expect(t.warnings[0]).toContain('não tem destaque')
    }
  })
})
