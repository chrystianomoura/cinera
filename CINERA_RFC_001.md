# Cinera - Engineering Architecture (v1.0)

## 1. Identidade Visual (Design System OLED)

- Background: Preto Puro (#000000)

- Superfícies/Cards: #0a0a0a e #121212

- Bordas: #1f1f1f

- Accent: #e50914

- Tipografia: Geist Sans (interface) e Space Mono (detalhes técnicos)

## 2. Stack Tecnológica

- Framework: React 19 + TypeScript (strict mode)

- Build Tool: Vite

- Estilização: Tailwind CSS v4

- Estado e Cache: Zustand e TanStack Query

## 3. Arquitetura de Dados & Segurança

- Isolamento: A interface nunca consome a API externa diretamente.

- Fluxo: TMDB -> Proxy Local -> Validação Zod -> Mappers -> Modelos de Domínio -> UI.

- Proxy Seguro: Todas as requisições passam por um proxy no Vite escondendo o token de acesso.

- Tratamento: Itens sem cartaz recebem fallback tipográfico próprio sem quebrar o layout da grade.

## 4. Estrutura de Diretórios

src/

├── domain/ (modelos de negócio e contratos de tipos)

├── infrastructure/ (cliente HTTP, schemas Zod e mappers)

├── features/ (módulos visuais: catálogo, busca, detalhes)

├── stores/ (gerenciamento de estado global com Zustand)

├── hooks/ (lógica reaproveitável)

└── lib/ (utilitários gerais)

## 5. Resiliência, Network & Performance

- Cliente HTTP nativo (fetch) com timeout estrito de 6s e suporte a AbortSignal.

- Cache inteligente com TanStack Query (staleTime configurado para dados que mudam pouco).

- Error Boundaries granulares por seção para evitar crash total da aplicação.

## 6. Estado na URL & Navegação

- A URL é a fonte única da verdade para busca, paginação e filtros (ex: /search?q=batman&page=2).

- Zustand reservado estritamente para estado efêmero e watchlist local.

## 7. Conformidade Legal & Atribuições

- Rodapé obrigatório com atribuição visual e textual dos termos de uso da API do TMDB e JustWatch.

- Escopo estritamente educacional e não-comercial.
