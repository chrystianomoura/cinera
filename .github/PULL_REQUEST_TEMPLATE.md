## O que muda

<!-- Em uma ou duas frases: o que este PR faz. -->

## Por quê

<!-- O problema ou a ideia por trás. Se fecha uma issue: "Fecha #123". -->

## Como conferi

- [ ] `npx tsc -b`
- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:e2e` (se a mudança altera o que o usuário vê)
- [ ] `npm run test:catalog` (se mexe no catálogo ou na curadoria)

## Conferências rápidas

- [ ] Não edita o catálogo à mão (`public/catalog.json`, `public/genres/`, `public/imdb.json`)
- [ ] Botões e links têm nome acessível que contém o texto visível
- [ ] Nenhuma chave ou segredo no código nem nos arquivos
- [ ] Tem print ou teste quando muda algo visível
