import type { ElementType, ReactNode } from "react";

/** Botão principal das mensagens de estado (ex.: "Tentar novamente", "Explorar Catálogo"). */
export const statusButtonClassName =
  "inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-bold text-xs sm:text-sm hover:bg-zinc-200 transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-[0_4px_16px_rgba(255,255,255,0.18)]";

interface StatusMessageProps {
  emoji: string;
  title: string;
  description?: string;
  /** Ação (botão) ou conteúdo extra abaixo do texto */
  children?: ReactNode;
  /** "compact" para usar dentro de painéis e seções; "default" para telas inteiras */
  size?: "default" | "compact";
  /** Sem espaçamento vertical próprio (quando o contêiner já centraliza) */
  flush?: boolean;
  /** Nível do título, para respeitar a hierarquia da tela */
  titleAs?: ElementType;
}

/**
 * Mensagem de estado padrão do Cinera (erro, vazio, não encontrado): emoji, título, texto e ação.
 * Erros usam 🤯; estados vazios e buscas sem resultado usam 😔.
 */
export function StatusMessage({
  emoji,
  title,
  description,
  children,
  size = "default",
  flush = false,
  titleAs: Title = "h3",
}: StatusMessageProps) {
  const isCompact = size === "compact";
  const spacing = flush ? "" : isCompact ? "py-4 sm:py-5 px-4" : "pt-8 pb-16 px-4";

  return (
    <div
      className={`max-w-md mx-auto text-center flex flex-col items-center justify-center animate-in fade-in duration-300 select-none ${spacing}`}
    >
      <span
        aria-hidden="true"
        className={`leading-none drop-shadow-md transition-transform hover:scale-110 duration-200 ${
          isCompact ? "text-4xl mb-2" : "text-5xl sm:text-6xl mb-3"
        }`}
      >
        {emoji}
      </span>

      <div className="space-y-1.5">
        <Title
          className={`font-bold text-white tracking-tight break-words [overflow-wrap:anywhere] ${
            isCompact ? "text-base sm:text-lg" : "text-lg sm:text-xl"
          }`}
        >
          {title}
        </Title>
        {description && (
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto">
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div>
      )}
    </div>
  );
}
