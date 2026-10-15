/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" liga o modo de demonstração: sem API, com filmes de exemplo */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Gerado no build por vite-plugin-hero-images.ts: caminho da foto na TMDB -> endereço do AVIF do próprio site. Vazio no dev. */
declare module 'virtual:hero-images' {
  const heroImages: Record<string, string>;
  export default heroImages;
}
