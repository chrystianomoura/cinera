import { z } from "zod";

// O Zod compila validadores com `new Function`, que a política de segurança do site (sem 'unsafe-eval') bloqueia.
// Precisa ser o primeiro import do app: os esquemas leem esta configuração assim que são criados.
z.config({ jitless: true });
