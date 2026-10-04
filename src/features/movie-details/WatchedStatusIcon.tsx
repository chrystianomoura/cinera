import { useEffect, useRef } from "react";

interface WatchedStatusIconProps {
  watched: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Ícone do botão "Já Assisti": círculo vermelho com X (ainda não assistiu) que vira círculo verde com ✓ (assistiu).
 * Ao trocar, o traço do ícone novo é desenhado, o do antigo some, a cor do círculo desliza e o conjunto dá um pulinho.
 * Na primeira exibição não anima (só reage a uma troca). Respeita "reduzir movimento".
 */
export function WatchedStatusIcon({ watched }: WatchedStatusIconProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const previous = useRef(watched);

  useEffect(() => {
    if (previous.current === watched) return;
    previous.current = watched;
    if (prefersReducedMotion()) return;
    svgRef.current?.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.2)", offset: 0.4 }, { transform: "scale(1)" }],
      { duration: 300, easing: "ease-out" },
    );
  }, [watched]);

  const reduce = prefersReducedMotion();

  // Cada traço é "desenhado" por stroke-dashoffset (pathLength=1 normaliza o comprimento). Escondido, fica transparente
  // para a ponta arredondada do traço não aparecer como um pontinho.
  const stroke = (visible: boolean) => ({
    strokeDasharray: 1,
    strokeDashoffset: visible ? 0 : 1,
    opacity: visible ? 1 : 0,
    transition: reduce
      ? "none"
      : visible
        ? "stroke-dashoffset 240ms ease-out 110ms, opacity 0s 110ms"
        : "stroke-dashoffset 140ms ease-in, opacity 0s 140ms",
  });

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="w-5 h-5 flex-shrink-0 text-zinc-950"
      style={{ transformOrigin: "center" }}
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        className={`motion-reduce:transition-none transition-colors duration-200 ${watched ? "fill-emerald-400" : "fill-rose-400"}`}
      />
      <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.6 8.6l6.8 6.8M15.4 8.6l-6.8 6.8" pathLength={1} style={stroke(!watched)} />
        <path d="M7.4 12.6l3.3 3.3 6-6.8" pathLength={1} style={stroke(watched)} />
      </g>
    </svg>
  );
}
