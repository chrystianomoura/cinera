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
- As chaves de API (TMDB e OMDb) ficam só no servidor: o site chama o Worker em `/api`, que as guarda como
  secrets do Cloudflare e só repassa as consultas que o app usa. Nunca versione arquivos `.env`.

## Fora do escopo

- Os serviços de terceiros usados pelo Cinera (TMDB, OMDb, YouTube, Cloudflare): reporte direto a eles.
