// Bulgarian plates: 1-2 Cyrillic letters + 4 digits + 2 Cyrillic letters
// Tesseract reads Cyrillic as Latin lookalikes: С→C, В→B, А→A, Е→E, К→K, М→M, Н→H, О→O, Р→P, Т→T, Х→X
// e.g. "СВ 1333 МР" → "CB 1333 MP"

const BG_PLATE_PATTERNS = [
  /^[A-Z]{1,2}\s?\d{4}\s?[A-Z]{2}$/,            // CB 1333 MP
  /^[A-Z]{1,2}\d{4}[A-Z]{2}$/,                   // CB1333MP
  /^[A-Z]{1,2}\s?\d{4}\s?[A-Z]{1,2}$/,           // looser: C 1333 M
  /^[A-Z]{2}\s?\d{3,4}\s?[A-Z]{1,2}$/,           // CB 133 MP (3 digits variant)
];

const US_EU_PATTERNS = [
  /^[A-Z0-9]{2,3}[-\s]?[A-Z0-9]{2,4}$/,
  /^[0-9]{1,4}[-\s]?[A-Z]{2,3}$/,
  /^[A-Z]{1,3}[-\s]?[0-9]{1,4}[-\s]?[A-Z]{0,3}$/,
  /^[0-9]{1,3}[-\s]?[A-Z]{1,3}[-\s]?[0-9]{1,4}$/,
];

const ALL_PATTERNS = [...BG_PLATE_PATTERNS, ...US_EU_PATTERNS];

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
  if (text.length < 4 || text.length > 12) return false;
  const hasDigits = /[0-9]/.test(text);
  const hasLetters = /[A-Z]/.test(text);
  if (!hasDigits || !hasLetters) return false;
  const stripped = text.replace(/[\s-]/g, "");
  return ALL_PATTERNS.some((p) => p.test(stripped));
}

/** Attempt to normalize OCR noise into a Bulgarian plate format */
function tryBulgarianNormalize(text: string): string | null {
  const stripped = text.replace(/[\s-]/g, "");
  // Try to match: 1-2 letters, 3-4 digits, 1-2 letters
  const m = stripped.match(/^([A-Z]{1,2})(\d{3,4})([A-Z]{1,2})$/);
  if (m) {
    return `${m[1]} ${m[2]} ${m[3]}`;
  }
  return null;
}

export function extractPlates(
  words: { text: string; confidence: number }[]
): ParsedPlate[] {
  const results: ParsedPlate[] = [];
  const seen = new Set<string>();

  // Single word check
  for (const word of words) {
    const cleaned = cleanText(word.text);
    if (cleaned.length < 2) continue;
    if (looksLikePlate(cleaned)) {
      const normalized = tryBulgarianNormalize(cleaned) ?? cleaned;
      if (!seen.has(normalized)) {
        seen.add(normalized);
        results.push({ text: normalized, confidence: word.confidence, isPlatePattern: true });
      }
    }
  }

  // Sliding window over adjacent words (combine 2-4 words)
  const windowSizes = [2, 3, 4];
  for (const size of windowSizes) {
    for (let i = 0; i <= words.length - size; i++) {
      const group = words.slice(i, i + size);
      const combined = group.map((w) => cleanText(w.text)).join("");
      if (combined.length < 4) continue;
      if (looksLikePlate(combined)) {
        const normalized = tryBulgarianNormalize(combined) ?? combined;
        if (!seen.has(normalized)) {
          seen.add(normalized);
          const avgConf = group.reduce((s, w) => s + w.confidence, 0) / group.length;
          results.push({ text: normalized, confidence: avgConf, isPlatePattern: true });
        }
      }
      // Also try with spaces preserved
      const spaced = group.map((w) => cleanText(w.text)).join(" ");
      if (looksLikePlate(spaced) && !seen.has(spaced)) {
        seen.add(spaced);
        const avgConf = group.reduce((s, w) => s + w.confidence, 0) / group.length;
        const normalized = tryBulgarianNormalize(spaced.replace(/\s/g, "")) ?? spaced;
        if (!seen.has(normalized)) {
          seen.add(normalized);
          results.push({ text: normalized, confidence: avgConf, isPlatePattern: true });
        }
      }
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
