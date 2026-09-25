interface ExtractedColor {
  r: number;
  g: number;
  b: number;
  hex: string;
  rgbString: string;
}

const colorCache = new Map<string, ExtractedColor>();
const DEFAULT_COLOR: ExtractedColor = {
  r: 30,
  g: 41,
  b: 59,
  hex: "#1e293b",
  rgbString: "30, 41, 59",
};

/**
 * Converte RGB para HSL para avaliação de vivacidade cromática.
 */
function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h, s, l];
}

function componentToHex(c: number): string {
  const hex = Math.round(c).toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

/**
 * Extrai a cor primária mais vibrante de uma imagem para ambientação de fundo.
 * - Renderiza em canvas offscreen (24x24px) para execução em tempo mínimo (< 2ms).
 * - Filtra pretos profundos, brancos lavados e cinzas neutros.
 * - Pondera saturação alta e luminosidade intermediária.
 * - Cache em memória por URL de imagem para evitar recálculos.
 */
export async function extractDominantColor(imageUrl?: string | null): Promise<ExtractedColor> {
  if (!imageUrl) return DEFAULT_COLOR;

  if (colorCache.has(imageUrl)) {
    return colorCache.get(imageUrl)!;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const timeoutId = setTimeout(() => {
      resolve(DEFAULT_COLOR);
    }, 2500);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(DEFAULT_COLOR);
          return;
        }

        const size = 24;
        canvas.width = size;
        canvas.height = size;
        ctx.drawImage(img, 0, 0, size, size);

        const imgData = ctx.getImageData(0, 0, size, size).data;
        let bestR = 30;
        let bestG = 41;
        let bestB = 59;
        let bestScore = -1;

        let totalR = 0;
        let totalG = 0;
        let totalB = 0;
        let validPixelsCount = 0;

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;

          const [, s, l] = rgbToHsl(r, g, b);

          // Ignora pretos puros, brancos ofuscantes e cinzas mortos
          if (l < 0.12 || l > 0.88 || s < 0.18) {
            continue;
          }

          totalR += r;
          totalG += g;
          totalB += b;
          validPixelsCount++;

          // Pontuação: valoriza saturação alta e luminosidade intermediária
          const lightnessScore = 1 - Math.abs(l - 0.5) * 1.5;
          const score = s * 2.0 + lightnessScore;

          if (score > bestScore) {
            bestScore = score;
            bestR = r;
            bestG = g;
            bestB = b;
          }
        }

        // Se encontrou uma cor vibrante destacada
        if (bestScore > 0) {
          const result: ExtractedColor = {
            r: bestR,
            g: bestG,
            b: bestB,
            hex: rgbToHex(bestR, bestG, bestB),
            rgbString: `${bestR}, ${bestG}, ${bestB}`,
          };
          colorCache.set(imageUrl, result);
          resolve(result);
          return;
        }

        // Se o cartaz for monocromático ou escuro, usa média ponderada ou fallback
        if (validPixelsCount > 0) {
          const avgR = Math.round(totalR / validPixelsCount);
          const avgG = Math.round(totalG / validPixelsCount);
          const avgB = Math.round(totalB / validPixelsCount);
          const result: ExtractedColor = {
            r: avgR,
            g: avgG,
            b: avgB,
            hex: rgbToHex(avgR, avgG, avgB),
            rgbString: `${avgR}, ${avgG}, ${avgB}`,
          };
          colorCache.set(imageUrl, result);
          resolve(result);
          return;
        }

        colorCache.set(imageUrl, DEFAULT_COLOR);
        resolve(DEFAULT_COLOR);
      } catch {
        resolve(DEFAULT_COLOR);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(DEFAULT_COLOR);
    };

    img.src = imageUrl;
  });
}
