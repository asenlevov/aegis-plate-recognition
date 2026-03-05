// Common license plate patterns (US, EU-style)
const PLATE_PATTERNS = [
  /^[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{2,4}$/,       // e.g. ABC 1234, AB-1234
  /^[0-9]{1,4}[-\s]?[A-Z]{2,3}$/,               // e.g. 1234 AB
  /^[A-Z]{1,3}[-\s]?[0-9]{1,4}[-\s]?[A-Z]{0,3}$/, // e.g. B 123 ABC
  /^[0-9]{1,3}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{1,4}$/, // e.g. 7 ABC 1234
];

export interface ParsedPlate {
  text: string;
  confidence: number;
  isPlatePattern: boolean;
}

function cleanText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePlate(text: string): boolean {
  if (text.length < 4 || text.length > 10) return false;
  const hasDigits = /[0-9]/.test(text);
  const hasLetters = /[A-Z]/.test(text);
  if (!hasDigits || !hasLetters) return false;
  const stripped = text.replace(/[\s-]/g, "");
  return PLATE_PATTERNS.some((p) => p.test(stripped));
}

export function extractPlates(
  words: { text: string; confidence: number }[]
): ParsedPlate[] {
  const results: ParsedPlate[] = [];

  for (const word of words) {
    const cleaned = cleanText(word.text);
    if (cleaned.length < 2) continue;
    const isPlate = looksLikePlate(cleaned);
    if (isPlate) {
      results.push({
        text: cleaned,
        confidence: word.confidence,
        isPlatePattern: true,
      });
    }
  }

  if (results.length === 0) {
    const allText = words.map((w) => cleanText(w.text)).join(" ");
    const windowSizes = [2, 3, 4];
    for (const size of windowSizes) {
      for (let i = 0; i <= words.length - size; i++) {
        const group = words.slice(i, i + size);
        const combined = group.map((w) => cleanText(w.text)).join("");
        if (looksLikePlate(combined)) {
          const avgConf =
            group.reduce((s, w) => s + w.confidence, 0) / group.length;
          results.push({
            text: combined,
            confidence: avgConf,
            isPlatePattern: true,
          });
        }
      }
    }

    if (results.length === 0 && allText.length >= 3) {
      const avgConf =
        words.reduce((s, w) => s + w.confidence, 0) / (words.length || 1);
      results.push({
        text: allText.slice(0, 10),
        confidence: avgConf * 0.5,
        isPlatePattern: false,
      });
    }
  }

  results.sort((a, b) => b.confidence - a.confidence);
  return results.slice(0, 5);
}

export function mockParkingStatus(): "VALID" | "EXPIRED" | "UNKNOWN" {
  const r = Math.random();
  if (r < 0.5) return "VALID";
  if (r < 0.8) return "EXPIRED";
  return "UNKNOWN";
}
