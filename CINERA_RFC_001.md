# Cinera - Arquitetura de Engenharia (v1.0)

## 1. Identidade Visual (Design System OLED)
- **Plano de Fundo (Background):** Preto Puro (#000000)
- **Superfícies/Cards:** #0a0a0a e #121212
- **Bordas:** #1f1f1f
- **Destaque (Accent):** Vermelho Cinema (#e50914)
- **Tipografia:** Geist Sans (interface do usuário) e Space Mono (detalhes técnicos e metadados)

## 2. Stack Tecnológica
- **Biblioteca de Interface:** React 19 com TypeScript (modo estrito)
- **Ferramenta de Build:** Vite
- **Estilização:** Tailwind CSS v4
- **Gerenciamento de Estado e Cache:** Zustand e TanStack Query

## 3. Arquitetura de Dados & Segurança
- **Isolamento de Domínio:** A interface de usuário nunca consome a API externa diretamente.
- **Fluxo Unidirecional:** TMDB -> Proxy Local -> Validação Zod -> Mappers -> Modelos de Domínio -> Componentes de UI.
- **Proxy Seguro:** Todas as requisições passam por um proxy no Vite, protegendo o token de acesso da exposição no navegador.
- **Tratamento de Exceções Visuais:** Itens sem cartaz ou imagem recebem fallback tipográfico estruturado, mantendo a grade visual íntegra.

## 4. Estrutura de Diretórios
```text
src/
├── domain/          (modelos de negócio e contratos de tipos)
├── infrastructure/  (cliente HTTP, schemas Zod e mappers)
├── features/        (módulos de tela: catálogo, busca, detalhes)
├── stores/          (gerenciamento de estado global com Zustand)
├── hooks/           (lógica reutilizável de componentes)
└── lib/             (utilitários e funções auxiliares)
```

## 5. Resiliência, Rede & Performance

* **Cliente de Rede:** Cliente HTTP nativo (fetch) com timeout estrito de 6 segundos e suporte a AbortSignal para cancelamento de requisições obsoletas.
* **Estratégia de Cache:** Cache inteligente via TanStack Query com tempo de expiração (`staleTime`) calibrado para dados estáticos.
* **Tolerância a Falhas:** Error Boundaries granulares por seção para evitar a queda total da aplicação em caso de erro isolado.

## 6. Estado na URL & Navegação

* **Fonte Única da Verdade:** A URL dita o estado da interface para termos de busca, paginação e filtros aplicados (exemplo: `/search?q=batman&page=2`).
* **Estado Efêmero:** Zustand restrito estritamente a estados transitórios de UI e à lista de interesses local (watchlist).

## 7. Conformidade Legal & Atribuições

* **Direitos Autorais:** Rodapé obrigatório com atribuição textual e gráfica conforme as diretrizes de uso das APIs do TMDB e JustWatch.
* **Natureza do Projeto:** Escopo estritamente educacional e não comercial.
