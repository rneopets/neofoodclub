interface BgColors {
  // Base backgrounds (using Chakra's built-in semantic tokens)
  canvas: string;
  panel: string;
  muted: string;
  subtle: string;
  emphasized: string;

  // Interactive states
  hover: string;
  active: string;
  disabled: string;

  // Status backgrounds (using Chakra's built-in semantic tokens)
  success: string;
  warning: string;
  error: string;
  info: string;

  // Payout backgrounds (using color semantic tokens)
  payoutPositive: string;
  payoutNegative: string;
  payoutNeutral: string;

  // Winner/loser highlighting (using color semantic tokens)
  winner: string;
  loser: string;

  // Pirate odds backgrounds (using color semantic tokens)
  pirateSafe: string;
  pirateStandard: string;
  pirateRisky: string;
  pirateUnsafe: string;

  // Text and border colors (using Chakra's built-in semantic tokens)
  textMuted: string;
  border: string;
}

const BG_COLORS: BgColors = {
  // Base backgrounds (Chakra's built-in bg semantic tokens)
  canvas: 'bg.panel',
  panel: 'bg.subtle',
  muted: 'bg.muted',
  subtle: 'bg.subtle',
  emphasized: 'bg.emphasized',

  // Interactive states (using gray color palette)
  hover: 'gray.subtle',
  active: 'gray.muted',
  disabled: 'gray.subtle',

  // Status backgrounds (Chakra's built-in semantic tokens)
  success: 'bg.success',
  warning: 'bg.warning',
  error: 'bg.error',
  info: 'bg.info',

  // Payout backgrounds (using color semantic tokens)
  payoutPositive: 'green.solid',
  payoutNegative: 'red.solid',
  payoutNeutral: 'transparent',

  // Winner/loser highlighting (using color semantic tokens)
  winner: 'green.solid',
  loser: 'red.subtle',

  // Pirate odds backgrounds (use variants for better readability)
  pirateSafe: 'green.solid',
  pirateStandard: 'blue.solid',
  pirateRisky: 'orange.solid',
  pirateUnsafe: 'red.solid',

  // Text and border colors (using Chakra's built-in semantic tokens)
  textMuted: 'fg.muted',
  border: 'border',
} as const;

/**
 * Hook that provides semantic background colors using Chakra UI v3's built-in tokens
 * Returns a stable reference without per-render allocation
 */
export const useBgColors = (): BgColors => BG_COLORS;
