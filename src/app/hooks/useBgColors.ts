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
  canvas: 'bg.panel', // white/gray.950
  panel: 'bg.subtle', // gray.50/gray.950
  muted: 'bg.muted', // gray.100/gray.900
  subtle: 'bg.subtle', // gray.50/gray.950
  emphasized: 'bg.emphasized', // gray.200/gray.800

  // Interactive states (using gray color palette)
  hover: 'gray.subtle', // gray.100/gray.900
  active: 'gray.muted', // gray.200/gray.800
  disabled: 'gray.subtle', // gray.100/gray.900

  // Status backgrounds (Chakra's built-in semantic tokens)
  success: 'bg.success', // green.50/green.950
  warning: 'bg.warning', // orange.50/orange.950
  error: 'bg.error', // red.50/red.950
  info: 'bg.info', // blue.50/blue.950

  // Payout backgrounds (using color semantic tokens)
  payoutPositive: 'green.subtle', // green.100/green.900
  payoutNegative: 'red.subtle', // red.100/red.900
  payoutNeutral: 'transparent',

  // Winner/loser highlighting (using color semantic tokens)
  winner: 'green.emphasized', // green.200/green.800
  loser: 'red.subtle', // red.100/red.900

  // Pirate odds backgrounds (using color semantic tokens)
  pirateSafe: 'green.solid', // 13:1+ odds (green.100/green.900)
  pirateStandard: 'blue.solid', // 3-5:1 odds (blue.100/blue.900)
  pirateRisky: 'orange.solid', // 6-9:1 odds (orange.100/orange.900)
  pirateUnsafe: 'red.solid', // 10-12:1 odds (red.100/red.900)

  // Text and border colors (using Chakra's built-in semantic tokens)
  textMuted: 'fg.muted', // gray.600/gray.400
  border: 'border', // gray.200/gray.800
} as const;

/**
 * Hook that provides semantic background colors using Chakra UI v3's built-in tokens
 * Returns a stable reference without per-render allocation
 */
export const useBgColors = (): BgColors => BG_COLORS;
