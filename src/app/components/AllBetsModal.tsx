import {
  Button,
  Dialog,
  Portal,
  CloseButton,
  Box,
  HStack,
  Text,
  Input,
  Stack,
  RadioGroup,
  Checkbox,
  Code,
} from '@chakra-ui/react';
import * as React from 'react';
import { List } from 'react-window';

import { PIRATE_NAMES } from '../constants';
import { useBetManagement } from '../hooks/useBetManagement';
import { useGetPirateBgColor } from '../hooks/useGetPirateBgColor';
import {
  computeBinaryToPirates,
  computeLogitProbabilities,
  computeLegacyProbabilities,
} from '../maths';
import { useRoundStore } from '../stores';
import { getMaxBet } from '../util';

interface AllBet {
  binary: number;
  pirates: number[];
  odds: number;
  probability: number;
  payoff: number;
  er: number;
  ne: number;
  maxBet: number;
}

interface AllBetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SortField = 'er' | 'ne' | 'odds' | 'maxBet';

interface RowData {
  allBets: AllBet[];
  pirateNames: Map<string, string>;
  pirateColors: Map<string, string>;
  showBinaryAsHex: boolean;
}

const Row = React.memo(
  ({
    index,
    style,
    allBets,
    pirateNames,
    pirateColors,
    showBinaryAsHex,
  }: {
    index: number;
    style: React.CSSProperties;
  } & RowData) => {
    const bet = allBets[index];
    if (!bet) {
      return null;
    }

    const binaryDisplay = showBinaryAsHex
      ? `0x${bet.binary.toString(16).toUpperCase().padStart(5, '0')}`
      : `0b${bet.binary.toString(2).padStart(20, '0')}`;

    return (
      <Box
        style={{
          ...style,
          animation: 'fadeIn 0.3s ease-in',
        }}
        borderBottomWidth="1px"
        css={{
          '@keyframes fadeIn': {
            from: { opacity: 0 },
            to: { opacity: 1 },
          },
        }}
      >
        <HStack px={2} py={1} fontSize="xs" gap={2} flexWrap="nowrap">
          <Text width="40px" textAlign="right" flexShrink={0}>
            {index + 1}
          </Text>
          <HStack width="350px" gap={1} flexShrink={0}>
            {bet.pirates.map((p, arenaIdx) => {
              const key = `${arenaIdx}-${p}`;
              const color = pirateColors.get(key);
              return (
                <Text
                  key={`${index}-${key}`}
                  width="70px"
                  fontSize="2xs"
                  truncate
                  flexShrink={0}
                  {...(color && { layerStyle: 'fill.subtle', colorPalette: color })}
                >
                  {pirateNames.get(key) || ''}
                </Text>
              );
            })}
          </HStack>
          <Text width="60px" textAlign="right" flexShrink={0}>
            {bet.odds}:1
          </Text>
          <Text width="80px" textAlign="right" flexShrink={0}>
            {bet.payoff.toLocaleString()}
          </Text>
          <Text width="60px" textAlign="right" flexShrink={0}>
            {(bet.probability * 100).toFixed(3)}%
          </Text>
          <Text width="60px" textAlign="right" flexShrink={0}>
            {bet.er.toFixed(3)}
          </Text>
          <Text width="80px" textAlign="right" flexShrink={0}>
            {bet.ne.toFixed(2)}
          </Text>
          <Text width="80px" textAlign="right" flexShrink={0}>
            {bet.maxBet.toLocaleString()}
          </Text>
          <Code
            fontSize="2xs"
            width={showBinaryAsHex ? '80px' : '130px'}
            textAlign="center"
            flexShrink={0}
          >
            {binaryDisplay}
          </Code>
        </HStack>
      </Box>
    );
  },
);

Row.displayName = 'AllBetsRow';

export const AllBetsModal: React.FC<AllBetsModalProps> = ({ isOpen, onClose }) => {
  const roundData = useRoundStore(state => state.roundData);
  const globalUseLogitModel = useRoundStore(state => state.useLogitModel);
  const currentSelectedRound = useRoundStore(state => state.currentSelectedRound);
  const { calculateBets } = useBetManagement();
  const getPirateBgColor = useGetPirateBgColor();

  // Get user's max bet setting
  const userMaxBet = getMaxBet(currentSelectedRound);
  const initialMaxBet = userMaxBet > 0 ? userMaxBet.toString() : '10000';

  const [maxBetInput, setMaxBetInput] = React.useState(initialMaxBet);
  const [debouncedMaxBet, setDebouncedMaxBet] = React.useState(userMaxBet > 0 ? userMaxBet : 10000);
  const [sortField, setSortField] = React.useState<SortField>('er');
  const [reverseSort, setReverseSort] = React.useState(true);
  const [useExperimentalLogit, setUseExperimentalLogit] = React.useState(globalUseLogitModel);
  const [showOnlyWinningBets, setShowOnlyWinningBets] = React.useState(false);
  const [showBinaryAsHex, setShowBinaryAsHex] = React.useState(true);
  const [isPending, startTransition] = React.useTransition();

  // Check if round is over
  const isRoundOver = React.useMemo(() => {
    const winners = roundData.winners;
    return !!(winners && winners.some(w => w > 0));
  }, [roundData.winners]);

  // Reset settings to global values when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setUseExperimentalLogit(globalUseLogitModel);
      const currentMaxBet = getMaxBet(currentSelectedRound);
      const maxBetValue = currentMaxBet > 0 ? currentMaxBet.toString() : '10000';
      setMaxBetInput(maxBetValue);
      setDebouncedMaxBet(currentMaxBet > 0 ? currentMaxBet : 10000);
    }
  }, [isOpen, globalUseLogitModel, currentSelectedRound]);

  // Debounce the max bet input
  React.useEffect((): (() => void) => {
    const timeout = setTimeout(() => {
      const value = Number(maxBetInput);
      if (!isNaN(value) && value > 0) {
        setDebouncedMaxBet(value);
      }
    }, 300);

    return (): void => {
      clearTimeout(timeout);
    };
  }, [maxBetInput]);

  // Compute both probability types independently
  const legacyProbabilities = React.useMemo(() => {
    if (!roundData) {
      return [];
    }
    return computeLegacyProbabilities(roundData).used;
  }, [roundData]);

  const logitProbabilities = React.useMemo(() => {
    if (!roundData) {
      return [];
    }
    return computeLogitProbabilities(roundData).used;
  }, [roundData]);

  // Choose which probabilities to use based on toggle
  const usedProbabilities = useExperimentalLogit ? logitProbabilities : legacyProbabilities;

  // Calculate all possible bets using the pre-computed bet calculations
  const allBets = React.useMemo(() => {
    if (!roundData || !roundData.pirates || roundData.pirates.length === 0 || !usedProbabilities) {
      return [];
    }

    // Get all possible bets (3124 combinations) using the existing calculateBets function
    const { betOdds, betCaps } = calculateBets(
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
      [0, 1, 2, 3, 4],
    );

    const bets: AllBet[] = [];

    // Convert from Maps to array
    for (const [binary, odds] of betOdds) {
      if (binary === 0 || odds === 0) {
        continue;
      }

      const pirates = computeBinaryToPirates(binary);

      // Calculate probability using the same logic as calculateBets
      let probability = 1;
      for (let i = 0; i < 5; i++) {
        const pirateIdx = pirates[i]!;
        if (pirateIdx === 0) {
          continue;
        }
        probability *= usedProbabilities[i]?.[pirateIdx] ?? 0;
      }

      const payoff = Math.min(debouncedMaxBet * odds, 1_000_000);
      const maxBet = betCaps.get(binary) || Math.floor(1_000_000 / (odds || 1));
      const er = odds * probability;
      const ne = payoff * probability - debouncedMaxBet;

      bets.push({
        binary,
        pirates,
        odds,
        probability,
        payoff,
        er,
        ne,
        maxBet,
      });
    }

    // Sort by selected field
    const sortMultiplier = reverseSort ? 1 : -1;
    return bets.sort((a, b) => {
      switch (sortField) {
        case 'er':
          return (b.er - a.er) * sortMultiplier;
        case 'ne':
          return (b.ne - a.ne) * sortMultiplier;
        case 'odds':
          return (b.odds - a.odds) * sortMultiplier;
        case 'maxBet':
          return (b.maxBet - a.maxBet) * sortMultiplier;
        default:
          return (b.er - a.er) * sortMultiplier;
      }
    });
  }, [roundData, calculateBets, usedProbabilities, debouncedMaxBet, sortField, reverseSort]);

  // Filter bets to only show winning bets if enabled
  const filteredBets = React.useMemo(() => {
    if (!showOnlyWinningBets || !isRoundOver || !roundData.winners) {
      return allBets;
    }

    // Filter to only bets where all selected pirates are winners
    return allBets.filter(bet => {
      for (let arenaIdx = 0; arenaIdx < 5; arenaIdx++) {
        const selectedPirate = bet.pirates[arenaIdx];
        const winner = roundData.winners?.[arenaIdx];

        // If a pirate is selected in this arena (not 0), it must match the winner
        if (selectedPirate && selectedPirate > 0 && selectedPirate !== winner) {
          return false;
        }
      }
      return true;
    });
  }, [allBets, showOnlyWinningBets, isRoundOver, roundData.winners]);

  // Pre-compute pirate names and colors map for fast lookups
  // Note: computeBinaryToPirates returns 1-4
  // pirates array is 0-indexed, odds arrays are 1-indexed
  const pirateNames = React.useMemo(() => {
    const names = new Map<string, string>();
    for (let arenaIdx = 0; arenaIdx < 5; arenaIdx++) {
      const arena = roundData.pirates[arenaIdx];
      if (!arena) {
        continue;
      }
      for (let pirateIdx = 1; pirateIdx <= 4; pirateIdx++) {
        const pirateId = arena[pirateIdx - 1]; // pirates array is 0-indexed
        if (pirateId) {
          const name = PIRATE_NAMES.get(pirateId) || '';
          names.set(`${arenaIdx}-${pirateIdx}`, name);
        }
      }
    }
    return names;
  }, [roundData.pirates]);

  const pirateColors = React.useMemo(() => {
    const colors = new Map<string, string>();
    const openingOdds = roundData.openingOdds;
    if (!openingOdds) {
      return colors;
    }

    for (let arenaIdx = 0; arenaIdx < 5; arenaIdx++) {
      const arenaOdds = openingOdds[arenaIdx];
      if (!arenaOdds) {
        continue;
      }
      for (let pirateIdx = 1; pirateIdx <= 4; pirateIdx++) {
        const odds = arenaOdds[pirateIdx]; // odds arrays are 1-indexed
        if (odds) {
          const color = getPirateBgColor(odds);
          colors.set(`${arenaIdx}-${pirateIdx}`, color);
        }
      }
    }
    return colors;
  }, [roundData.openingOdds, getPirateBgColor]);

  // Item data for react-window
  const itemData = React.useMemo<RowData>(
    () => ({
      allBets: filteredBets,
      pirateNames,
      pirateColors,
      showBinaryAsHex,
    }),
    [filteredBets, pirateNames, pirateColors, showBinaryAsHex],
  );

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
      size="cover"
      preventScroll
      modal
    >
      <Portal container={document.body}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>
                All Possible Bets ({filteredBets.length}
                {showOnlyWinningBets && allBets.length !== filteredBets.length
                  ? ` of ${allBets.length}`
                  : ''}
                )
              </Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflow="hidden">
              <Stack gap={4} flex={1} minHeight={0}>
                <Text fontSize="sm" color="fg.muted" flexShrink={0}>
                  Note: Settings changed here will not affect your saved settings.
                </Text>

                <Stack gap={3} flexShrink={0}>
                  {/* Max Bet Input */}
                  <HStack>
                    <Text fontSize="sm" fontWeight="medium" width="70px">
                      Max Bet:
                    </Text>
                    <Input
                      type="number"
                      value={maxBetInput}
                      onChange={e => setMaxBetInput(e.target.value)}
                      width="120px"
                      size="sm"
                    />
                  </HStack>

                  {/* Sort Controls */}
                  <HStack gap={4}>
                    <Text fontSize="sm" fontWeight="medium" width="70px">
                      Sort by:
                    </Text>
                    <RadioGroup.Root
                      value={sortField}
                      onValueChange={(details: { value: string }) => {
                        startTransition(() => {
                          setSortField(details.value as SortField);
                        });
                      }}
                    >
                      <HStack gap={3}>
                        <RadioGroup.Item value="er">
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>ER</RadioGroup.ItemText>
                        </RadioGroup.Item>
                        <RadioGroup.Item value="ne">
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>NE</RadioGroup.ItemText>
                        </RadioGroup.Item>
                        <RadioGroup.Item value="odds">
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>Odds</RadioGroup.ItemText>
                        </RadioGroup.Item>
                        <RadioGroup.Item value="maxBet">
                          <RadioGroup.ItemHiddenInput />
                          <RadioGroup.ItemIndicator />
                          <RadioGroup.ItemText>MaxBet</RadioGroup.ItemText>
                        </RadioGroup.Item>
                      </HStack>
                    </RadioGroup.Root>
                    <Checkbox.Root
                      checked={reverseSort}
                      onCheckedChange={() => {
                        startTransition(() => {
                          setReverseSort(!reverseSort);
                        });
                      }}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>Reverse</Checkbox.Label>
                    </Checkbox.Root>
                  </HStack>

                  {/* Filter Options */}
                  <HStack gap={4}>
                    <Text fontSize="sm" fontWeight="medium" width="70px">
                      Options:
                    </Text>
                    <HStack gap={4}>
                      <Checkbox.Root
                        checked={useExperimentalLogit}
                        onCheckedChange={() => {
                          startTransition(() => {
                            setUseExperimentalLogit(!useExperimentalLogit);
                          });
                        }}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>Experimental Logit</Checkbox.Label>
                      </Checkbox.Root>

                      <Checkbox.Root
                        checked={showBinaryAsHex}
                        onCheckedChange={() => setShowBinaryAsHex(!showBinaryAsHex)}
                      >
                        <Checkbox.HiddenInput />
                        <Checkbox.Control />
                        <Checkbox.Label>Show Binary as Hex</Checkbox.Label>
                      </Checkbox.Root>

                      {isRoundOver && (
                        <Checkbox.Root
                          checked={showOnlyWinningBets}
                          onCheckedChange={() => {
                            startTransition(() => {
                              setShowOnlyWinningBets(!showOnlyWinningBets);
                            });
                          }}
                        >
                          <Checkbox.HiddenInput />
                          <Checkbox.Control />
                          <Checkbox.Label>Show Only Winning Bets</Checkbox.Label>
                        </Checkbox.Root>
                      )}
                    </HStack>
                  </HStack>
                </Stack>

                <Box flex={1} minHeight={0} display="flex" flexDirection="column">
                  {/* Header */}
                  <Box borderBottomWidth="2px" fontWeight="bold" bg="bg.muted" flexShrink={0}>
                    <HStack px={2} py={2} fontSize="xs" gap={2} flexWrap="nowrap">
                      <Text width="40px" textAlign="right" flexShrink={0}>
                        #
                      </Text>
                      <Text width="350px" flexShrink={0}>
                        Pirates
                      </Text>
                      <Text width="60px" textAlign="right" flexShrink={0}>
                        Odds
                      </Text>
                      <Text width="80px" textAlign="right" flexShrink={0}>
                        Payoff
                      </Text>
                      <Text width="60px" textAlign="right" flexShrink={0}>
                        Prob
                      </Text>
                      <Text width="60px" textAlign="right" flexShrink={0}>
                        ER
                      </Text>
                      <Text width="80px" textAlign="right" flexShrink={0}>
                        NE
                      </Text>
                      <Text width="80px" textAlign="right" flexShrink={0}>
                        MaxBet
                      </Text>
                      <Text
                        width={showBinaryAsHex ? '80px' : '130px'}
                        textAlign="center"
                        flexShrink={0}
                      >
                        Binary
                      </Text>
                    </HStack>
                  </Box>

                  {/* Virtualized List */}
                  <Box
                    flex={1}
                    minHeight={0}
                    opacity={isPending ? 0.5 : 1}
                    transition="opacity 0.2s"
                  >
                    <List<RowData>
                      defaultHeight={400}
                      rowCount={filteredBets.length}
                      rowHeight={32}
                      rowComponent={Row}
                      rowProps={itemData as RowData}
                    />
                  </Box>
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
