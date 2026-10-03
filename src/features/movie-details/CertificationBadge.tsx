interface CertificationBadgeProps {
  certification?: string | null;
  className?: string;
}

/**
 * Badge de classificação indicativa oficial brasileira (Ministério da Justiça).
 * Mapeia códigos nacionais (L, 10, 12, 14, 16, 18) com as cores padronizadas. O número vai em preto (exceto
 * no fundo preto do 18) porque branco sobre o verde, o azul, o laranja e o vermelho não atinge o contraste
 * mínimo de 4,5:1 do WCAG AA.
 */
export function CertificationBadge({ certification, className = "" }: CertificationBadgeProps) {
  if (certification == null) return null;

  const raw = String(certification).trim().toUpperCase();
  if (!raw) return null;

  let label = "";
  let bgClass = "bg-zinc-800 text-zinc-300 border-zinc-700";
  let descriptiveLabel = "";

  // Suporte a formatos: "L", "LIVRE", "G", "10", "A10", "12 ANOS", "PG-13", etc.
  if (/^(L|LIVRE|G)\b/.test(raw)) {
    label = "L";
    bgClass = "bg-[#00a651] text-black border-[#00a651]";
    descriptiveLabel = "Livre para todos os públicos";
  } else {
    const match = raw.match(/\d+/);
    const numeric = match ? match[0] : null;

    if (numeric === "10" || raw === "PG") {
      label = "10";
      bgClass = "bg-[#008bd2] text-black border-[#008bd2]";
      descriptiveLabel = "Não recomendado para menores de 10 anos";
    } else if (numeric === "12") {
      label = "12";
      bgClass = "bg-[#ffcc00] text-black border-[#ffcc00]";
      descriptiveLabel = "Não recomendado para menores de 12 anos";
    } else if (numeric === "14" || raw === "PG-13") {
      label = "14";
      bgClass = "bg-[#f58220] text-black border-[#f58220]";
      descriptiveLabel = "Não recomendado para menores de 14 anos";
    } else if (numeric === "16" || raw === "R") {
      label = "16";
      bgClass = "bg-[#ed1c24] text-black border-[#ed1c24]";
      descriptiveLabel = "Não recomendado para menores de 16 anos";
    } else if (numeric === "18" || raw === "NC-17") {
      label = "18";
      bgClass = "bg-black text-white border-white/50";
      descriptiveLabel = "Não recomendado para menores de 18 anos";
    } else {
      // Se não for uma classificação conhecida, não renderiza badge quebrado
      return null;
    }
  }

  return (
    <span
      role="img"
      aria-label={`Classificação indicativa: ${descriptiveLabel}`}
      title={`Classificação Indicativa: ${label}`}
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-black leading-none select-none border shadow-sm ${bgClass} ${className}`}
    >
      {label}
    </span>
  );
}
