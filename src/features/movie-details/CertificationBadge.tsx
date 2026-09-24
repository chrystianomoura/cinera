interface CertificationBadgeProps {
  certification?: string | null;
  className?: string;
}

/**
 * Badge de classificação indicativa oficial brasileira (Ministério da Justiça).
 * Mapeia códigos nacionais (L, 10, 12, 14, 16, 18) com as cores padronizadas.
 */
export function CertificationBadge({ certification, className = "" }: CertificationBadgeProps) {
  if (!certification || !certification.trim()) return null;

  const raw = certification.trim().toUpperCase();

  let label = raw;
  let bgClass = "bg-zinc-800 text-zinc-300 border-zinc-700";

  if (raw === "L" || raw === "LIVRE" || raw === "G") {
    label = "L";
    bgClass = "bg-[#00a651] text-white border-[#00a651]";
  } else if (raw === "10" || raw === "PG") {
    label = "10";
    bgClass = "bg-[#008bd2] text-white border-[#008bd2]";
  } else if (raw === "12") {
    label = "12";
    bgClass = "bg-[#ffcc00] text-black border-[#ffcc00] font-black";
  } else if (raw === "14" || raw === "PG-13") {
    label = "14";
    bgClass = "bg-[#f58220] text-white border-[#f58220]";
  } else if (raw === "16" || raw === "R") {
    label = "16";
    bgClass = "bg-[#ed1c24] text-white border-[#ed1c24]";
  } else if (raw === "18" || raw === "NC-17") {
    label = "18";
    bgClass = "bg-black text-white border-white/50";
  }

  return (
    <span
      title={`Classificação Indicativa: ${label}`}
      className={`inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold leading-none select-none border shadow-sm ${bgClass} ${className}`}
    >
      {label}
    </span>
  );
}
