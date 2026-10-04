/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "true" liga o modo de demonstração: sem API, com filmes de exemplo */
  readonly VITE_DEMO_MODE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
