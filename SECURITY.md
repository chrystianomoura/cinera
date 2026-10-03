# Política de segurança

## Como reportar uma vulnerabilidade

Se você encontrou uma falha de segurança no Cinera, **não abra uma issue pública**.
Use o canal privado do GitHub: aba **Security → Report a vulnerability** deste repositório.

Inclua, se possível:

- uma descrição do problema e do impacto;
- os passos para reproduzir;
- a versão ou o commit em que você viu o problema.

Respondo o mais rápido possível e agradeço o aviso responsável.

## Escopo

- O código deste repositório e o site publicado a partir dele.
- As chaves de API do front-end (TMDB e OMDb) ficam visíveis no navegador por natureza: use chaves
  próprias, de uso restrito, ao rodar o projeto, e nunca versione arquivos `.env`.

## Fora do escopo

- Os serviços de terceiros usados pelo Cinera (TMDB, OMDb, YouTube, Cloudflare): reporte direto a eles.
