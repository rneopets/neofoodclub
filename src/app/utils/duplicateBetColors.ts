export const DUPLICATE_BET_COLOR_PALETTE = [
  'nfc-purple',
  'nfc-orange',
  'nfc-teal',
  'nfc-pink',
  'nfc-cyan',
  'nfc-yellow',
  'nfc-blue',
] as const;
// nfc-red / nfc-green intentionally excluded: they already mean "error" / "success" elsewhere in the app.

export function computeDuplicateBetGroupColors(
  betBinariesMap: Map<number, number>,
): Map<number, string> {
  const groups = new Map<number, number[]>();

  for (const [betNum, binary] of betBinariesMap) {
    if (binary === 0) continue;

    const existing = groups.get(binary);
    if (existing) {
      existing.push(betNum);
    } else {
      groups.set(binary, [betNum]);
    }
  }

  const result = new Map<number, string>();
  let colorIndex = 0;

  for (const [binary, betNums] of groups) {
    if (betNums.length >= 2) {
      const color = DUPLICATE_BET_COLOR_PALETTE[colorIndex % DUPLICATE_BET_COLOR_PALETTE.length] as string;
      result.set(binary, color);
      colorIndex += 1;
    }
  }

  return result;
}
