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

## Por que a Home distribui os filmes entre as fileiras, em vez de cada uma pegar os seus?

- **O problema.** Novidades e Em Alta dividem os lançamentos de qualidade (só uns 40 a 50 passam nos filtros). A Home dava a cada fileira, na ordem, os primeiros filmes ainda livres: Novidades levava os 20 melhores e o Em Alta ficava com o resto, descontados também os 1 a 3 do destaque. Com 37 filmes na lista e 15 a 19 repetidos com Novidades, sobravam 17 a 19, e a verificação (que exige 20) reprovava. Foi a causa de 5 das 6 falhas do robô entre 17/10 e 03/11; a sexta foi um erro de rede.
- **O que medi.** Nos 30 catálogos publicados, a união de Novidades e Em Alta (sem o destaque) tem no mínimo 45 filmes distintos para 40 vagas. No dia que reprovaria, eram 47. O conjunto sempre bastou; a divisão é que era ruim.
- **A solução.** `assignHomeRows` parte do resultado de sempre e, só para a fileira que ficou com menos de 20, procura os que faltam: primeiro filmes que ninguém pegou, depois filmes de outra fileira que tenha reposição na própria lista, começando pelo de pior posição na lista dela. Pode encadear. A ordem da curadoria em cada fileira é mantida, e nenhum filme entra sem passar nos filtros de hoje. Nos 30 catálogos publicados, a Home é idêntica à de antes.
- **O que ficou de fora.** Trocar a ordem das fileiras só muda o problema de dono (Novidades cairia para 16). Afrouxar os filtros ou somar fontes de filmes encheria o Em Alta de clássicos de sempre (medi `/movie/popular`: ~150 elegíveis novos, quase todos clássicos), que não estão "em alta" e tirariam filmes de Clássicos e Aclamados. Aceitar a Home com menos de 20 esconderia a falha em vez de corrigi-la. Permitir o mesmo filme em duas fileiras deixaria a Home repetitiva.
- **Quando ainda falha.** Só se a união das listas não tiver filmes distintos suficientes; aí a verificação reprova e o catálogo anterior continua no ar, como antes.
