import { useState } from "react";
import type { MovieWatchProviders } from "@/domain";
import { filterValidProviders, type ProcessedProvider } from "./provider-rules";

interface WatchProvidersRowProps {
  providers?: MovieWatchProviders | null;
  isLoading?: boolean;
  isError?: boolean;
}

/**
 * Componente isolado para o logo com fallback para iniciais se a imagem falhar
 */
function ProviderLogo({
  logoUrl,
  name,
}: {
  logoUrl: string | null;
  name: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (!logoUrl || hasError) {
    return (
      <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center text-xs font-bold text-zinc-300 flex-shrink-0 shadow-sm">
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt=""
      className="w-10 h-10 rounded-xl object-cover shadow-sm flex-shrink-0"
      onError={() => setHasError(true)}
    />
  );
}

/** Cartão de uma plataforma: logo, nome e tipo (Assinatura/Aluguel), com link para a página inicial. */
function ProviderCard({
  provider,
  type,
}: {
  provider: ProcessedProvider;
  type: string;
}) {
  return (
    <a
      href={provider.homeUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={
        provider.addonNote
          ? `Acessar home do ${provider.cleanName} — ${provider.addonNote} (Abre em nova aba)`
          : `Acessar home do ${provider.cleanName} (Abre em nova aba)`
      }
      className="group/provider flex items-center gap-3 w-fit max-w-[15rem] px-3 py-2 rounded-2xl bg-zinc-900/80 hover:bg-zinc-800 border border-white/10 hover:border-white/30 transition-colors duration-200 shadow-md wide:backdrop-blur-md cursor-pointer active:scale-[0.99]"
    >
      <ProviderLogo logoUrl={provider.logoUrl} name={provider.cleanName} />
      <span className="flex flex-col min-w-0 leading-tight text-left">
        <span className="text-sm font-semibold text-zinc-100 group-hover/provider:text-white tracking-wide truncate">
          {provider.cleanName}
        </span>
        <span className="text-xs text-zinc-400 mt-0.5">
          {provider.requiresAddon ? `${type} + canal extra` : type}
        </span>
      </span>
    </a>
  );
}

export function WatchProvidersRow({ providers, isLoading, isError = false }: WatchProvidersRowProps) {
  const title = (
    <h3 className="text-sm sm:text-[15px] wide:text-xs uppercase tracking-wider text-zinc-400 font-bold text-center wide:text-left">
      Onde Assistir
    </h3>
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center wide:items-start gap-2.5 pt-3 border-t border-white/25 wide:border-white/10 w-full">
        {title}
        <div className="flex gap-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className="h-14 w-36 rounded-2xl bg-zinc-900 border border-white/5 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center wide:items-start gap-2.5 pt-3 border-t border-white/25 wide:border-white/10 w-full">
        {title}
        <p className="text-zinc-100 font-medium text-base sm:text-lg wide:text-sm text-center wide:text-left">
          Não foi possível carregar onde assistir agora. Tente novamente em instantes.
        </p>
      </div>
    );
  }

  // A assinatura tem prioridade: o aluguel só aparece quando não há nenhuma assinatura possível (inclui canais
  // extras). Compra não é exibida.
  const subscription = filterValidProviders(providers?.flatrate || []);
  const rental = subscription.length > 0 ? [] : filterValidProviders(providers?.rent || []);

  // Cada tipo na sua linha, com os cartões seguindo para a direita
  const lines = [
    { type: "Assinatura", list: subscription },
    { type: "Aluguel", list: rental },
  ].filter((line) => line.list.length > 0);

  // Sem nenhuma plataforma, a seção inteira (título e frase) não aparece
  if (lines.length === 0) return null;

  return (
    <div className="flex flex-col items-center wide:items-start gap-2.5 pt-3 border-t border-white/25 wide:border-white/10 w-full">
      {title}

      <div className="flex flex-col gap-2.5 w-full">
        {lines.map((line) => (
          <div
            key={line.type}
            className="flex flex-wrap items-center justify-center wide:justify-start gap-2.5 w-full"
          >
            {line.list.map((provider) => (
              <ProviderCard key={provider.providerId} provider={provider} type={line.type} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
