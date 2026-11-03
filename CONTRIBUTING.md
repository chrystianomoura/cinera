# Como contribuir com o CINERA

Obrigado pelo interesse! O CINERA é um projeto pessoal, mas aceita correções e ideias. Este guia diz como rodar, o que conferir antes de abrir um PR e como o repositório é organizado.

## Rodando localmente

Requisito: Node 24 (o mesmo do CI e do robô; há um `.nvmrc`).

```bash
git clone https://github.com/chrystianomoura/cinera.git
cd cinera
npm ci
VITE_DEMO_MODE=true npm run dev   # http://localhost:5173, com filmes de exemplo e sem nenhuma chave
```

Para usar dados reais, copie o `.env.example` para `.env.local` e preencha as chaves. O passo a passo e a lista de scripts estão no [README](README.md#rodando-localmente).

## Antes de abrir um PR

O CI roda tudo isto a cada push; rode antes para não esperar:

```bash
npx tsc -b            # tipos
npm run lint          # oxlint
npm test              # testes unitários (Vitest)
npm run test:e2e      # ponta a ponta e acessibilidade (Playwright; faz o build e sobe o preview)
npm run test:catalog  # só se mexer no catálogo ou na curadoria: valida o catálogo publicado
```

Se a mudança altera o que o usuário vê, junte um print ou o trecho do teste que cobre o caso.

## O que merece cuidado

- **Catálogo:** `public/catalog.json`, `public/genres/` e `public/imdb.json` são gerados pelo robô diário. Não edite à mão: a próxima rodada sobrescreve. Para mudar a curadoria, altere as regras em [`scripts/curation/`](scripts/curation) e o teste que a cobre.
- **Acessibilidade:** o nome acessível de um botão ou link precisa conter o texto que aparece nele (WCAG 2.5.3, rótulo no nome). O axe (versão 4.14) confere isso nos testes ponta a ponta.
- **Chaves de API:** nunca vão para o navegador nem para o repositório. O site fala só com o Worker em `/api`.
- **Segurança:** se achou uma vulnerabilidade, **não abra uma issue pública**. Siga a [política de segurança](.github/SECURITY.md).

## Convenções

- **Commits:** [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em português, com escopo quando ajuda. Exemplos reais do histórico: `fix(ficha): classificação só brasileira`, `perf(destaque): preload da primeira foto`, `docs: README revisado`. Tipos usados: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `ci` e `chore`.
- **Idioma:** identificadores e nomes de arquivo em inglês (`kebab-case`); comentários, mensagens de commit e documentação em português.
- **Estrutura:** `src/` por domínio, funcionalidade e infraestrutura; testes unitários ao lado do código (`*.test.ts`); testes ponta a ponta em `e2e/`. O mapa completo está no [README](README.md#estrutura).

## Licença

Ao contribuir, você concorda que o seu trabalho seja distribuído sob a [licença MIT](LICENSE) do projeto.
