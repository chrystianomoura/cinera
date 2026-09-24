/**
 * Formata a duração em minutos de um filme para o padrão abreviado (ex: "2h 49m" ou "45m").
 */
export function formatRuntime(minutes?: number): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Formata valores financeiros em dólares para padrão abreviado legível em pt-BR (ex: "$ 237 milhões" ou "$ 2,92 bilhões").
 */
export function formatCurrencyUSD(amount?: number): string | null {
  if (!amount || amount <= 0) return null;

  if (amount >= 1_000_000_000) {
    const billions = amount / 1_000_000_000;
    const formatted = billions.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    });
    return `$ ${formatted} ${billions >= 2 ? "bilhões" : "bilhão"}`;
  }

  if (amount >= 1_000_000) {
    const millions = amount / 1_000_000;
    const formatted = millions.toLocaleString("pt-BR", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
    return `$ ${formatted} ${millions >= 2 ? "milhões" : "milhão"}`;
  }

  return `$ ${amount.toLocaleString("pt-BR")}`;
}
