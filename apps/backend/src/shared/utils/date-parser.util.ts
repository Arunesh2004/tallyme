export class DateParserUtil {
  /**
   * Safely parses string dates from AI output.
   * Accepts: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, ISO string
   * Returns: Valid Date object or null if invalid/impossible
   */
  static parse(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') return null;

    const sanitized = dateStr.trim();
    if (
      sanitized === '' ||
      sanitized.toUpperCase() === 'N/A' ||
      sanitized.toUpperCase() === 'UNKNOWN'
    ) {
      return null;
    }

    // Attempt DD/MM/YYYY or DD-MM-YYYY
    const dmyMatch = sanitized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10);
      const year = parseInt(dmyMatch[3], 10);

      return this.validateAndCreate(year, month, day);
    }

    // Attempt YYYY-MM-DD or YYYY/MM/DD
    const ymdMatch = sanitized.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10);
      const day = parseInt(ymdMatch[3], 10);

      return this.validateAndCreate(year, month, day);
    }

    // Attempt ISO or standard parse fallback
    const parsed = new Date(sanitized);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  }

  private static validateAndCreate(
    year: number,
    month: number,
    day: number,
  ): Date | null {
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;

    // Days in month check
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    if (day > daysInMonth) return null;

    const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));

    if (isNaN(date.getTime())) return null;

    return date;
  }
}
