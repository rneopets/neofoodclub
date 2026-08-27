import { describe, expect, it } from 'vitest';

import { parseFcDataCsv, parseFcDate } from '../fcDataCsv';

describe('parseFcDate', () => {
  it('parses a valid DD/MM/YY date', () => {
    const date = parseFcDate('24/04/18');
    expect(date).not.toBeNull();
    expect(date?.getFullYear()).toBe(2018);
    expect(date?.getMonth()).toBe(3);
    expect(date?.getDate()).toBe(24);
  });

  it('pivots the two-digit year at the boundary', () => {
    expect(parseFcDate('01/01/69')?.getFullYear()).toBe(2069);
    expect(parseFcDate('01/01/70')?.getFullYear()).toBe(1970);
  });

  it('accepts a valid leap day', () => {
    const date = parseFcDate('29/02/24');
    expect(date).not.toBeNull();
    expect(date?.getMonth()).toBe(1);
    expect(date?.getDate()).toBe(29);
  });

  it('rejects a leap day in a non-leap year instead of rolling over', () => {
    expect(parseFcDate('29/02/23')).toBeNull();
  });

  it('rejects out-of-range months and days', () => {
    expect(parseFcDate('13/13/24')).toBeNull();
    expect(parseFcDate('32/01/24')).toBeNull();
  });

  it('rejects garbage input', () => {
    expect(parseFcDate('not-a-date')).toBeNull();
    expect(parseFcDate('')).toBeNull();
    expect(parseFcDate('2024-01-01')).toBeNull();
  });
});

describe('parseFcDataCsv', () => {
  const header = 'Date, Round, Units Won, NeoFoodClub URL';
  const row1 = '24/04/18, 6927, 0, https://neofood.club/#round=6927&b=uyeewuweemueeawkycewuyjey';
  const row2 = '25/04/18, 6928, 8, https://neofood.club/#round=6928&b=rudodpudokradofpusekwudkd';
  const row3 = '26/04/18, 6929, 12, https://neofood.club/#round=6929&b=ksccpktccukshdaksmdvkkcnp';

  it('parses a valid multi-row file with the header, trimming leading spaces', () => {
    const { rows, warnings } = parseFcDataCsv([header, row1, row2, row3].join('\n'));

    expect(warnings).toHaveLength(0);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toEqual({
      date: new Date(2018, 3, 24),
      rawDate: '24/04/18',
      round: 6927,
      unitsWon: 0,
      url: 'https://neofood.club/#round=6927&b=uyeewuweemueeawkycewuyjey',
    });
    expect(rows[1]!.round).toBe(6928);
    expect(rows[1]!.unitsWon).toBe(8);
    expect(rows[2]!.round).toBe(6929);
  });

  it('parses a file with no header, keeping the first data row', () => {
    const { rows, warnings } = parseFcDataCsv([row1, row2].join('\n'));

    expect(warnings).toHaveLength(0);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.round).toBe(6927);
  });

  it('ignores blank leading, trailing, and interior lines', () => {
    const { rows, warnings } = parseFcDataCsv(['', header, row1, '', row2, '', ''].join('\n'));

    expect(warnings).toHaveLength(0);
    expect(rows).toHaveLength(2);
  });

  it('handles CRLF line endings', () => {
    const { rows, warnings } = parseFcDataCsv([header, row1, row2].join('\r\n'));

    expect(warnings).toHaveLength(0);
    expect(rows).toHaveLength(2);
  });

  it('sorts rows ascending by round even if the input is out of order', () => {
    const { rows } = parseFcDataCsv([header, row3, row1, row2].join('\n'));

    expect(rows.map(r => r.round)).toEqual([6927, 6928, 6929]);
  });

  it('warns on and skips a row with the wrong field count, keeping other rows', () => {
    const { rows, warnings } = parseFcDataCsv([header, row1, '24/04/18, 6930, 0', row2].join('\n'));

    expect(rows).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.line).toBe(3);
    expect(warnings[0]!.reason).toMatch(/4 fields/);
  });

  it('warns on and skips a row with a non-numeric round', () => {
    const { rows, warnings } = parseFcDataCsv(
      [header, row1, '24/04/18, abc, 0, https://neofood.club/#round=1', row2].join('\n'),
    );

    expect(rows).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/invalid round/);
  });

  it('warns on and skips a row with an invalid units won value', () => {
    const { rows, warnings } = parseFcDataCsv(
      [header, row1, '24/04/18, 6930, -5, https://neofood.club/#round=6930', row2].join('\n'),
    );

    expect(rows).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/invalid units won/);
  });

  it('warns on and skips a row with an unparseable date', () => {
    const { rows, warnings } = parseFcDataCsv(
      [header, row1, 'not-a-date, 6930, 0, https://neofood.club/#round=6930', row2].join('\n'),
    );

    expect(rows).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/unparseable date/);
  });

  it('warns on and skips a row with a missing or invalid URL', () => {
    const { rows, warnings } = parseFcDataCsv(
      [header, row1, '24/04/18, 6930, 0, not-a-url', row2].join('\n'),
    );

    expect(rows).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.reason).toMatch(/URL/);
  });

  it('returns an empty result for empty input', () => {
    expect(parseFcDataCsv('')).toEqual({ rows: [], warnings: [] });
    expect(parseFcDataCsv('   \n  \n')).toEqual({ rows: [], warnings: [] });
  });
});
