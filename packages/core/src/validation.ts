// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEVANAGARI_MAP: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

// ---------------------------------------------------------------------------
// Core normalizer
// ---------------------------------------------------------------------------

/**
 * Uppercase, trim, and convert Devanagari numerals to ASCII.
 */
export function normalizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  let out = input.trim().toUpperCase();
  out = out.replace(/[०१२३४५६७८९]/g, (ch) => DEVANAGARI_MAP[ch] ?? ch);
  return out;
}

// ---------------------------------------------------------------------------
// GSTIN checksum (Luhn mod 36)
// ---------------------------------------------------------------------------

function gstinChecksum(normalized: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const code = GSTIN_CHARSET.indexOf(normalized[i]);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = code * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checkIndex = (36 - (sum % 36)) % 36;
  return GSTIN_CHARSET[checkIndex];
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

/**
 * Validate a GSTIN (Goods and Services Tax Identification Number).
 * Accepts lowercase and Devanagari numerals — normalizes before checking.
 *
 * Format: 2 digit state code + 10 char PAN + 1 entity number + Z + 1 checksum
 */
export function validateGSTIN(input: unknown): boolean {
  if (typeof input !== 'string' || !input) return false;
  const n = normalizeInput(input);
  if (n.length !== 15) return false;
  // State code (01–37 or 97/99 for special), then PAN pattern, then entity digit, then Z
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$/;
  if (!pattern.test(n)) return false;
  return gstinChecksum(n) === n[14];
}

/**
 * Validate a CIN (Corporate Identification Number).
 * Format: L/U + 5 digits + 2 alpha state + 4 digit year + PTC/LLC/etc (3) + 6 digits = 21 chars
 */
export function validateCIN(input: unknown): boolean {
  if (typeof input !== 'string' || !input) return false;
  const n = normalizeInput(input);
  if (n.length !== 21) return false;
  const pattern = /^[LU][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/;
  return pattern.test(n);
}

/**
 * Validate a PAN (Permanent Account Number).
 * Format: 5 alpha + 4 digits + 1 alpha = 10 chars
 */
export function validatePAN(input: unknown): boolean {
  if (typeof input !== 'string' || !input) return false;
  const n = normalizeInput(input);
  if (n.length !== 10) return false;
  const pattern = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  return pattern.test(n);
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Extract PAN from a GSTIN (characters 3–12, 1-indexed → index 2..11).
 */
export function extractPANFromGSTIN(gstin: string): string {
  const n = normalizeInput(gstin);
  return n.slice(2, 12);
}

/**
 * Redact PAN for display: keep first 2 chars + **** + last 4 chars.
 * e.g. AABCU9603R → AA****603R
 */
export function redactPAN(pan: string): string {
  const n = normalizeInput(pan);
  if (n.length < 6) return '****';
  return n.slice(0, 2) + '****' + n.slice(6);
}
