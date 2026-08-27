/** One parsed data row from fc_data.csv (a NeoBot personal bet-history export). */
export interface FcDataRow {
  /** Local midnight, parsed from DD/MM/YY. */
  date: Date;
  /** Original DD/MM/YY string as it appeared in the CSV, for display/debugging. */
  rawDate: string;
  round: number;
  unitsWon: number;
  /** The exact bet URL from the CSV row - used directly, never reconstructed. */
  url: string;
}

export interface FcDataParseWarning {
  line: number;
  raw: string;
  reason: string;
}

export interface FcDataParseResult {
  /** Sorted ascending by round. */
  rows: FcDataRow[];
  warnings: FcDataParseWarning[];
}

const HEADER_PATTERN = /^date\s*,\s*round\s*,\s*units\s*won\s*,\s*neofoodclub\s*url\s*$/i;
const DATE_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/;
const TWO_DIGIT_YEAR_PIVOT = 70;

/**
 * Parses a DD/MM/YY date string, pivoting the 2-digit year at 70
 * (69 -> 2069, 70 -> 1970) and rejecting calendar-invalid dates (e.g.
 * 31/02/24) instead of letting them silently roll over to the next month.
 */
export function parseFcDate(raw: string): Date | null {
  const match = DATE_PATTERN.exec(raw.trim());
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const twoDigitYear = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const year = twoDigitYear < TWO_DIGIT_YEAR_PIVOT ? 2000 + twoDigitYear : 1900 + twoDigitYear;
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }

  return date;
}

/**
 * Parses a NeoBot fc_data.csv export into rows, skipping and warning on any
 * malformed line rather than failing the whole import.
 */
export function parseFcDataCsv(text: string): FcDataParseResult {
  const rows: FcDataRow[] = [];
  const warnings: FcDataParseWarning[] = [];

  const lines = text.split(/\r?\n/);
  let sawFirstNonBlankLine = false;

  lines.forEach((rawLine, index) => {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (line.length === 0) {
      return;
    }

    const isFirstNonBlankLine = !sawFirstNonBlankLine;
    sawFirstNonBlankLine = true;

    if (isFirstNonBlankLine && HEADER_PATTERN.test(line)) {
      return;
    }

    const fields = line.split(',').map(field => field.trim());
    if (fields.length !== 4) {
      warnings.push({
        line: lineNumber,
        raw: rawLine,
        reason: `expected 4 fields, got ${fields.length}`,
      });
      return;
    }

    const rawDate = fields[0]!;
    const roundStr = fields[1]!;
    const unitsStr = fields[2]!;
    const url = fields[3]!;

    const date = parseFcDate(rawDate);
    if (date === null) {
      warnings.push({ line: lineNumber, raw: rawLine, reason: `unparseable date "${rawDate}"` });
      return;
    }

    const round = Number.parseInt(roundStr, 10);
    if (!Number.isFinite(round) || round <= 0) {
      warnings.push({ line: lineNumber, raw: rawLine, reason: `invalid round "${roundStr}"` });
      return;
    }

    const unitsWon = Number.parseInt(unitsStr, 10);
    if (!Number.isFinite(unitsWon) || unitsWon < 0) {
      warnings.push({ line: lineNumber, raw: rawLine, reason: `invalid units won "${unitsStr}"` });
      return;
    }

    if (!url || !url.startsWith('http')) {
      warnings.push({ line: lineNumber, raw: rawLine, reason: 'missing or invalid URL' });
      return;
    }

    rows.push({ date, rawDate, round, unitsWon, url });
  });

  rows.sort((a, b) => a.round - b.round);

  return { rows, warnings };
}
