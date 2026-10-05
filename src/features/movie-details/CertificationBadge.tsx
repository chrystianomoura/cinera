import { resolveCertification } from "./certification";

interface CertificationBadgeProps {
  certification?: string | null;
  className?: string;
}

/**
 * Badge de classificação indicativa oficial brasileira (Ministério da Justiça), com as cores padronizadas. O número vai
 * em preto (exceto no fundo preto do 18) porque branco sobre o verde, o azul, o laranja e o vermelho não atinge o
 * contraste mínimo de 4,5:1 do WCAG AA. O mapeamento dos códigos está em certification.ts.
 */
export function CertificationBadge({ certification, className = "" }: CertificationBadgeProps) {
  const resolved = resolveCertification(certification);
  // Código desconhecido: não renderiza badge quebrado
  if (!resolved) return null;
  const { label, bgClass, descriptiveLabel } = resolved;

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
