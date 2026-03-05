// Bulgarian plates: 1-2 Cyrillic letters + 4 digits + 2 Cyrillic letters
// Tesseract reads Cyrillic as Latin lookalikes: С→C, В→B, А→A, Е→E, К→K, М→M, Н→H, О→O, Р→P, Т→T, Х→X

const BG_PLATE_PATTERNS = [
  /^[A-Z]{1,2}\s?\d{4}\s?[A-Z]{2}$/,
  /^[A-Z]{1,2}\d{4}[A-Z]{2}$/,
  /^[A-Z]{1,2}\s?\d{4}\s?[A-Z]{1,2}$/,
  /^[A-Z]{2}\s?\d{3,4}\s?[A-Z]{1,2}$/,
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

/** Common OCR misreads — correct ambiguous characters */
const OCR_FIXES: Record<string, string> = {
  O: "0",
  D: "0",
  Q: "0",
  I: "1",
  L: "1",
  Z: "2",
  S: "5",
  G: "6",
  B: "8",
};

/**
 * Fix OCR artifacts in recognized text.
 * In a digit context, letters get corrected to their digit lookalike.
 * In a letter context, digits get corrected to their letter lookalike.
 */
function fixOcrArtifacts(text: string): string {
  // Try to detect BG plate format: letters-digits-letters
  const stripped = text.replace(/[\s-]/g, "");
  if (stripped.length < 4) return text;

  // Find the digit cluster in the middle
  const match = stripped.match(/^([A-Z]{1,2})(.{3,4})([A-Z]{1,2})$/);
  if (match) {
    const [, prefix, middle, suffix] = match;
    // Fix middle to be all digits
    const fixedMiddle = middle
      .split("")
      .map((c) => (/[0-9]/.test(c) ? c : OCR_FIXES[c] ?? c))
      .join("");
    // Fix prefix/suffix to be all letters
    const fixPrefix = prefix
      .split("")
      .map((c) => (/[A-Z]/.test(c) ? c : c === "0" ? "O" : c === "1" ? "I" : c === "8" ? "B" : c))
      .join("");
    const fixSuffix = suffix
      .split("")
      .map((c) => (/[A-Z]/.test(c) ? c : c === "0" ? "O" : c === "1" ? "I" : c === "8" ? "B" : c))
      .join("");
    return `${fixPrefix} ${fixedMiddle} ${fixSuffix}`;
  }
  return text;
}

function cleanText(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^A-Z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikePlate(text: string): boolean {
  if (text.length < 3 || text.length > 12) return false;
  const hasDigits = /[0-9]/.test(text);
  const hasLetters = /[A-Z]/.test(text);
  if (!hasDigits || !hasLetters) return false;
  const stripped = text.replace(/[\s-]/g, "");
  return ALL_PATTERNS.some((p) => p.test(stripped));
}

/** Fuzzy check: has digits + letters mixed, even if no strict pattern match */
function isFuzzyPlate(text: string): boolean {
  const stripped = text.replace(/[\s-]/g, "");
  if (stripped.length < 3 || stripped.length > 12) return false;
  const digits = (stripped.match(/[0-9]/g) || []).length;
  const letters = (stripped.match(/[A-Z]/g) || []).length;
  return digits >= 2 && letters >= 1;
}

function tryBulgarianNormalize(text: string): string | null {
  const stripped = text.replace(/[\s-]/g, "");
  const m = stripped.match(/^([A-Z]{1,2})(\d{3,4})([A-Z]{1,2})$/);
  if (m) return `${m[1]} ${m[2]} ${m[3]}`;
  return null;
}

/**
 * Extract license plates from OCR words.
 * @param isConfirmedPlate - true when the crop came from YOLO detection (we KNOW it's a plate)
 */
export function extractPlates(
  words: { text: string; confidence: number }[],
  isConfirmedPlate = false
): ParsedPlate[] {
  const results: ParsedPlate[] = [];
  const seen = new Set<string>();

  const addResult = (text: string, confidence: number, isPattern: boolean) => {
    const fixed = fixOcrArtifacts(text);
    const normalized = tryBulgarianNormalize(fixed.replace(/\s/g, "")) ?? fixed;
    if (!seen.has(normalized) && normalized.length >= 3) {
      seen.add(normalized);
      results.push({ text: normalized, confidence, isPlatePattern: isPattern });
    }
  };

  // Single word check
  for (const word of words) {
    const cleaned = cleanText(word.text);
    if (cleaned.length < 2) continue;
    if (looksLikePlate(cleaned)) {
      addResult(cleaned, word.confidence, true);
    }
  }

  // Sliding window: combine 2-4 adjacent words
  for (const size of [2, 3, 4]) {
    for (let i = 0; i <= words.length - size; i++) {
      const group = words.slice(i, i + size);
      const combined = group.map((w) => cleanText(w.text)).join("");
      if (combined.length < 3) continue;
      const avgConf = group.reduce((s, w) => s + w.confidence, 0) / group.length;
      if (looksLikePlate(combined)) {
        addResult(combined, avgConf, true);
      }
    }
  }

  // If YOLO confirmed this is a plate and no strict match found, use fuzzy
  if (isConfirmedPlate && results.length === 0) {
    // Join all words as one candidate
    const allText = words.map((w) => cleanText(w.text)).join("");
    const avgConf =
      words.length > 0
        ? words.reduce((s, w) => s + w.confidence, 0) / words.length
        : 0;

    if (isFuzzyPlate(allText)) {
      addResult(allText, avgConf * 0.85, false);
    } else if (allText.length >= 3) {
      addResult(allText, avgConf * 0.6, false);
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
