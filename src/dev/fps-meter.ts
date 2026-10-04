// Medidor de FPS só para desenvolvimento (npm run dev + ?fps=1). Não entra no build publicado.
// Mede os quadros da thread principal (requestAnimationFrame): mostra quando o JavaScript ou o layout engasgam.
// Não enxerga o trabalho do GPU, então um quadro lento aqui é certeza de engasgo; 60 aqui não garante que o GPU deu conta.

export function startFpsMeter() {
  const box = document.createElement("div");
  box.style.cssText =
    "position:fixed;top:4px;left:4px;z-index:2147483647;pointer-events:none;font:600 11px/1.35 ui-monospace,monospace;" +
    "color:#fff;background:rgba(0,0,0,.72);border:1px solid rgba(255,255,255,.25);border-radius:6px;padding:4px 7px;white-space:pre";
  document.body.appendChild(box);

  const WINDOW_MS = 3000;
  const frames: { t: number; dt: number }[] = [];
  let last = 0;
  let worstEver = 0;
  let longTasks: { t: number; d: number }[] = [];

  try {
    new PerformanceObserver((list) => {
      const now = performance.now();
      for (const entry of list.getEntries()) longTasks.push({ t: now, d: entry.duration });
    }).observe({ type: "longtask", buffered: false });
  } catch {
    // Safari não tem longtask: o medidor segue só com os quadros
  }

  const percentile = (values: number[], p: number) => {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
  };

  let lastPaint = 0;
  const tick = (now: number) => {
    if (last) frames.push({ t: now, dt: now - last });
    last = now;
    while (frames.length && now - frames[0].t > WINDOW_MS) frames.shift();
    longTasks = longTasks.filter((task) => now - task.t <= WINDOW_MS);

    if (now - lastPaint > 250 && frames.length > 5) {
      lastPaint = now;
      const dts = frames.map((f) => f.dt);
      // Atualização típica do aparelho (60 ou 120 Hz): o quadro mais comum da janela
      const base = percentile(dts, 0.25);
      const fps = 1000 / (dts.reduce((a, b) => a + b, 0) / dts.length);
      const p95 = percentile(dts, 0.95);
      const worst = Math.max(...dts);
      worstEver = Math.max(worstEver, worst);
      // Engasgo = quadro que levou o dobro do normal (e pelo menos 25ms)
      const stutters = dts.filter((d) => d > base * 2 && d > 25).length;
      const color = stutters === 0 && p95 < base * 1.5 ? "#4ade80" : stutters <= 2 ? "#facc15" : "#f87171";
      box.style.color = color;
      box.textContent =
        `${fps.toFixed(0)} fps  (quadro normal ${base.toFixed(0)}ms)\n` +
        `p95 ${p95.toFixed(0)}ms · pior ${worst.toFixed(0)}ms\n` +
        `engasgos (3s): ${stutters}` +
        (longTasks.length ? `\ntarefas longas: ${longTasks.length}` : "") +
        `\npior da sessão: ${worstEver.toFixed(0)}ms`;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
