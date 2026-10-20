# Decisões de engenharia (complemento)

Decisões menores que não cabem no README. As principais estão em [Decisões de engenharia](../README.md#decisões-de-engenharia).

## Por que publicar as notas do IMDb junto com o catálogo?

O robô já busca essas notas para a curadoria e as descartava. Publicá-las num arquivo de ~21 KB (gzip) faz a ficha dos filmes do catálogo abrir sem nenhuma chamada externa: mais rápida, funciona mesmo se a API cair e não gasta cota por visitante. A consulta ao vivo ficou só para a cauda longa.

## Por que o Zod roda em modo `jitless`?

Por padrão, o Zod gera código com `new Function` para validar mais rápido, e isso exige `unsafe-eval` na política de segurança. Em vez de afrouxar a CSP, o app liga o modo `jitless` (em [`zod-config.ts`](src/infrastructure/zod-config.ts)), que troca um pouco de velocidade por uma política sem `eval`. Como os arquivos validados são pequenos, a diferença não aparece.

## Por que o fim da lista "poda" filmes?

Para a última linha da grade fechar cheia em qualquer largura (2, 3, 4, 5 ou 6 colunas). A grade lê o número de colunas do próprio CSS e esconde no máximo `colunas − 1` filmes, só quando não há mais o que carregar. É um detalhe pequeno que muda a sensação de acabamento.

## Por que o preload da foto é gerado no build, e não escrito no HTML?

- **A foto muda todo dia.** O robô gira a ordem do destaque, então um `<link>` escrito à mão apontaria para a foto errada. O build lê o `catalog.json` do dia e escreve a tag; o catálogo e o `index.html` saem no mesmo deploy, então combinam.
- **O `<img>` e o preload têm que pedir a mesma foto.** Com o AVIF, é o mesmo arquivo; no plano B, as duas partes usam a mesma função ([`hero-image.ts`](src/features/hero/hero-image.ts)), com teste, e o mesmo `sizes`. Se um pedisse outra foto, o navegador baixaria duas vezes, e o preload seria pior do que nada.
- **Sem preload ou sem AVIF, o build avisa em vez de falhar.** Com o catálogo ilegível, sem destaque ou uma foto que não baixa, o site só ficaria mais lento, não quebrado, então o build segue, mas escreve um aviso no registro. E o teste ponta a ponta confere o `index.html` publicado, para essa perda não passar em silêncio.

## Por que as importações da configuração do Vite escrevem `.ts`?

O Vite avisava que o carregador "native" de configuração vai virar o padrão e não aceita importação sem extensão. Os arquivos que o `vite.config.ts` importa (o Worker local, o plugin das fotos do destaque e o que ele usa) agora escrevem o `.ts`, e os `tsconfig` liberam isso com `allowImportingTsExtensions` (sem efeito na saída: o projeto já usa `noEmit`). O aviso sumiu, e `vite build --configLoader native` lê a configuração normalmente.

## Por que recodificar as fotos do destaque em AVIF?

- **Por quê.** A TMDB só entrega JPEG, e a única versão nítida o bastante é a `original` (3840 px, de 0,6 a 1,5 MB por foto, ~7,6 s para ficar pronta num 4G lento). A `w1280` pesa pouco, mas fica borrada. O AVIF de 3840 px com qualidade 50 pesa ~260 KB e é quase indistinguível da original (comparado lado a lado numa foto: a textura fina fica um pouco mais lisa).
- **Como desligar.** `CINERA_HERO_AVIF=off` nas variáveis do build desliga a geração, e o site volta ao JPEG da TMDB (o plano B, que também é nítido, só mais pesado).
