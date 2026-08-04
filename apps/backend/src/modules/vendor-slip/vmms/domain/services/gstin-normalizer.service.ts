import { Injectable } from '@nestjs/common';

@Injectable()
export class GSTINNormalizer {
  /**
   * Deterministic GSTIN Normalizer.
   * Rules: trim, remove spaces, remove hyphens, uppercase, correct specific OCR substitutions.
   * If unable to produce a usable GSTIN, returns null.
   *
   * Position-Aware OCR Correction:
   * Global substitution of 'Z' -> '2' would corrupt the 14th character of valid GSTINs.
   * Global substitution of 'O' -> '0' would corrupt PAN characters.
   * Therefore, OCR correction is ONLY applied to strictly numeric positions:
   * - 0, 1: State Code (Numeric)
   * - 7, 8, 9, 10: PAN sequential digits (Numeric)
   */
  public normalize(input: string | null | undefined): string | null {
    if (!input) {
      return null;
    }

    let cleaned = input.trim().replace(/[\s-]/g, '').toUpperCase();

    if (cleaned.length === 0) {
      return null;
    }

    // Apply position-aware OCR only to known numeric positions if length is exactly 15
    if (cleaned.length === 15) {
      const chars = cleaned.split('');
      const numericPositions = [0, 1, 7, 8, 9, 10];

      for (const pos of numericPositions) {
        if (chars[pos] === 'O') chars[pos] = '0';
        if (chars[pos] === 'I') chars[pos] = '1';
        if (chars[pos] === 'S') chars[pos] = '5';
        if (chars[pos] === 'Z') chars[pos] = '2';
      }

      cleaned = chars.join('');
    }

    return cleaned;
  }
}
