import {
  Box,
  Button,
  Card,
  CloseButton,
  Code,
  Dialog,
  HStack,
  Input,
  Portal,
  Select,
  SimpleGrid,
  Stack,
  Text,
  createListCollection,
} from '@chakra-ui/react';
import * as React from 'react';
import { FaExchangeAlt } from 'react-icons/fa';

import { ARENA_NAMES, PIRATE_NAMES, FULL_PIRATE_NAMES } from '../../constants';
import { useBacktestPreviousRounds } from '../../hooks/useBacktestPreviousRounds';
import {
  arenaBreakdown,
  currentStreak,
  findSharedEncounters,
  longestWinStreak,
  summarizeMatchup,
} from '../../matchup/pirateMatchups';
import { MatchupArenaBarChart } from '../charts/MatchupArenaBarChart';
import {
  MATCHUP_A_COLOR,
  MATCHUP_B_COLOR,
  MATCHUP_NEITHER_COLOR,
  MatchupSplitDoughnut,
} from '../charts/MatchupSplitDoughnut';
import { MatchupTrendChart } from '../charts/MatchupTrendChart';

import { Tooltip } from '@/components/ui/tooltip';

interface PirateMatchupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RangePreset = 'last30' | 'last100' | 'last500' | 'all';

const RANGE_PRESETS: { value: RangePreset; label: string; count: number | null }[] = [
  { value: 'last30', label: 'Last 30', count: 30 },
  { value: 'last100', label: 'Last 100', count: 100 },
  { value: 'last500', label: 'Last 500', count: 500 },
  { value: 'all', label: 'All time', count: null },
];

const RECENT_FORM_COUNT = 25;

function pirateName(id: number): string {
  return PIRATE_NAMES.get(id) ?? `Pirate ${id}`;
}

function pirateFullName(id: number): string {
  return FULL_PIRATE_NAMES.get(id) ?? `Pirate ${id}`;
}

function displayPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function PirateColumn({
  label,
  value,
  otherValue,
  onChange,
}: {
  label: string;
  value: number;
  otherValue: number;
  onChange: (id: number) => void;
}): React.JSX.Element {
  const collection = React.useMemo(
    () =>
      createListCollection({
        items: Array.from(PIRATE_NAMES, ([id, name]) => ({
          label: name,
          value: String(id),
        })),
      }),
    [],
  );

  return (
    <Stack gap={1}>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Select.Root
        collection={collection}
        size="sm"
        value={[String(value)]}
        minW="140px"
        onValueChange={(details: { value: string[] }) => {
          const id = parseInt(details.value[0] ?? '', 10);
          if (!Number.isNaN(id) && id !== otherValue) {
            onChange(id);
          }
        }}
      >
        <Select.HiddenSelect />
        <Select.Control layerStyle="fill.subtle">
          <Select.Trigger>
            <Select.ValueText />
          </Select.Trigger>
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Control>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map(item => (
              <Select.Item
                item={item}
                key={item.value}
                {...(Number(item.value) === otherValue
                  ? { _disabled: { opacity: 0.5, cursor: 'not-allowed' } }
                  : {})}
              >
                <Select.ItemText>{item.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Select.Root>
    </Stack>
  );
}

export function PirateMatchupModal({
  isOpen,
  onClose,
}: PirateMatchupModalProps): React.JSX.Element {
  const { status, rounds, newestRound, error, refetch } = useBacktestPreviousRounds({
    enabled: isOpen,
  });

  // Defaults mirror the classic Gooblah-vs-Buck rivalry so something interesting
  // is on screen as soon as history has loaded.
  const [pirateAId, setPirateAId] = React.useState(15);
  const [pirateBId, setPirateBId] = React.useState(19);
  const [rangePreset, setRangePreset] = React.useState<RangePreset>('all');
  const [minRoundInput, setMinRoundInput] = React.useState('');
  const [maxRoundInput, setMaxRoundInput] = React.useState('');

  const aName = pirateName(pirateAId);
  const bName = pirateName(pirateBId);

  const allEncounters = React.useMemo(
    () => (status === 'ready' ? findSharedEncounters(rounds, pirateAId, pirateBId) : []),
    [status, rounds, pirateAId, pirateBId],
  );

  const visibleEncounters = React.useMemo(() => {
    if (allEncounters.length === 0) {
      return [];
    }

    const min = parseInt(minRoundInput, 10);
    const max = parseInt(maxRoundInput, 10);
    const hasCustomRange = !Number.isNaN(min) || !Number.isNaN(max);

    let filtered = allEncounters;
    if (hasCustomRange) {
      filtered = filtered.filter(encounter => {
        const aboveMin = Number.isNaN(min) || encounter.round >= min;
        const belowMax = Number.isNaN(max) || encounter.round <= max;
        return aboveMin && belowMax;
      });
    } else {
      const preset = RANGE_PRESETS.find(p => p.value === rangePreset);
      if (preset && preset.count !== null) {
        filtered = filtered.slice(-preset.count);
      }
    }

    return filtered;
  }, [allEncounters, rangePreset, minRoundInput, maxRoundInput]);

  const summary = React.useMemo(() => summarizeMatchup(visibleEncounters), [visibleEncounters]);
  const breakdown = React.useMemo(() => arenaBreakdown(visibleEncounters), [visibleEncounters]);

  const aLongest = React.useMemo(
    () => longestWinStreak(visibleEncounters, 'a'),
    [visibleEncounters],
  );
  const bLongest = React.useMemo(
    () => longestWinStreak(visibleEncounters, 'b'),
    [visibleEncounters],
  );
  const aCurrent = React.useMemo(() => currentStreak(visibleEncounters, 'a'), [visibleEncounters]);
  const bCurrent = React.useMemo(() => currentStreak(visibleEncounters, 'b'), [visibleEncounters]);

  const statusText = React.useMemo(() => {
    if (status === 'loading') {
      return 'Downloading previous.jsonl (~13MB)...';
    }
    if (status === 'error') {
      return error ?? 'Failed to load round history.';
    }
    if (status === 'ready') {
      return `${rounds.length} rounds loaded (newest #${newestRound}).`;
    }
    return '';
  }, [status, error, rounds.length, newestRound]);

  const handlePresetClick = React.useCallback((preset: RangePreset): void => {
    setRangePreset(preset);
    // A preset supersedes any custom bounds.
    setMinRoundInput('');
    setMaxRoundInput('');
  }, []);

  const handleSwap = React.useCallback((): void => {
    setPirateAId(pirateBId);
    setPirateBId(pirateAId);
  }, [pirateAId, pirateBId]);

  const decided = summary.aWins + summary.bWins;
  const recentForm = visibleEncounters.slice(-RECENT_FORM_COUNT);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
      size="cover"
      preventScroll
      modal
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Pirate Matchups</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Every round all 20 pirates are fielded - four per arena, reshuffled daily. Pick
                  two pirates to see how they do <em>when drawn into the same arena</em>: who takes
                  their head-to-head, where it happens, and how the rivalry has trended over time.
                </Text>

                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                  <Text fontSize="sm" color="fg.muted">
                    {statusText}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={status === 'loading'}
                  >
                    Refresh
                  </Button>
                </HStack>

                <Card.Root boxShadow="sm">
                  <Card.Body p={3}>
                    <Stack gap={3} direction={{ base: 'column', md: 'row' }} align="center">
                      <HStack gap={3} flexWrap="wrap" justify="center">
                        <PirateColumn
                          label="Pirate A"
                          value={pirateAId}
                          otherValue={pirateBId}
                          onChange={setPirateAId}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSwap}
                          title="Swap A and B"
                          aria-label="Swap pirates"
                        >
                          <FaExchangeAlt />
                        </Button>
                        <PirateColumn
                          label="Pirate B"
                          value={pirateBId}
                          otherValue={pirateAId}
                          onChange={setPirateBId}
                        />
                      </HStack>

                      <HStack gap={2} flexWrap="wrap" justify="center">
                        {RANGE_PRESETS.map(preset => (
                          <Button
                            key={preset.value}
                            size="xs"
                            variant={
                              rangePreset === preset.value && !minRoundInput && !maxRoundInput
                                ? 'solid'
                                : 'outline'
                            }
                            onClick={() => handlePresetClick(preset.value)}
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </HStack>

                      <HStack gap={2} justify="center">
                        <Input
                          type="number"
                          placeholder="Min round"
                          value={minRoundInput}
                          onChange={e => setMinRoundInput(e.target.value)}
                          width="110px"
                          size="xs"
                        />
                        <Text fontSize="sm" color="fg.muted">
                          to
                        </Text>
                        <Input
                          type="number"
                          placeholder="Max round"
                          value={maxRoundInput}
                          onChange={e => setMaxRoundInput(e.target.value)}
                          width="110px"
                          size="xs"
                        />
                      </HStack>
                    </Stack>
                  </Card.Body>
                </Card.Root>

                {status === 'ready' && visibleEncounters.length === 0 && (
                  <Text fontSize="sm" color="fg.muted">
                    {aName} and {bName} never shared an arena in the selected range.
                  </Text>
                )}

                {visibleEncounters.length > 0 && (
                  <>
                    <Card.Root boxShadow="sm">
                      <Card.Body p={3}>
                        <Stack gap={3}>
                          {/* The neobot-style summary, with the numbers the sentence is about. */}
                          <Text fontSize="sm" lineHeight="tall">
                            {aName} and {bName} played the same arena{' '}
                            <Code fontSize="sm">{summary.sharedRounds}</Code> times - {aName} won{' '}
                            <Box as="span" color={MATCHUP_A_COLOR} fontWeight="semibold">
                              {summary.aWins} (
                              {displayPercent(
                                summary.sharedRounds > 0 ? summary.aWins / summary.sharedRounds : 0,
                              )}
                              )
                            </Box>
                            , {bName} won{' '}
                            <Box as="span" color={MATCHUP_B_COLOR} fontWeight="semibold">
                              {summary.bWins} (
                              {displayPercent(
                                summary.sharedRounds > 0 ? summary.bWins / summary.sharedRounds : 0,
                              )}
                              )
                            </Box>
                            , and neither of them won{' '}
                            <Code fontSize="sm">
                              {summary.neitherCount} (
                              {displayPercent(
                                summary.sharedRounds > 0
                                  ? summary.neitherCount / summary.sharedRounds
                                  : 0,
                              )}
                              )
                            </Code>
                            .
                          </Text>

                          {/* Head-to-head among *decided* arenas - the fair fight metric. */}
                          {summary.headToHeadA !== null && summary.headToHeadB !== null ? (
                            <Stack gap={1}>
                              <HStack justify="space-between">
                                <Text fontSize="xs" color="fg.muted">
                                  Head-to-head (decided arenas only, n={decided})
                                </Text>
                              </HStack>
                              <Box h="24px" borderRadius="md" overflow="hidden" display="flex">
                                <Box
                                  bg={MATCHUP_A_COLOR}
                                  flexBasis={`${summary.headToHeadA * 100}%`}
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Text fontSize="xs" color="white" fontWeight="semibold">
                                    {aName} {displayPercent(summary.headToHeadA)}
                                  </Text>
                                </Box>
                                <Box
                                  bg={MATCHUP_B_COLOR}
                                  flexBasis={`${summary.headToHeadB * 100}%`}
                                  display="flex"
                                  alignItems="center"
                                  justifyContent="center"
                                >
                                  <Text fontSize="xs" color="white" fontWeight="semibold">
                                    {bName} {displayPercent(summary.headToHeadB)}
                                  </Text>
                                </Box>
                              </Box>
                            </Stack>
                          ) : (
                            <Text fontSize="xs" color="fg.muted">
                              Neither pirate ever won their head-to-head in this range.
                            </Text>
                          )}

                          <HStack gap={4} flexWrap="wrap">
                            {aLongest && (
                              <Text fontSize="xs" color="fg.muted">
                                Longest {aName} streak:{' '}
                                <b>{aLongest.count} shared arenas won in a row</b> (rounds{' '}
                                {aLongest.startRound}&ndash;{aLongest.endRound})
                              </Text>
                            )}
                            {bLongest && (
                              <Text fontSize="xs" color="fg.muted">
                                Longest {bName} streak:{' '}
                                <b>{bLongest.count} shared arenas won in a row</b> (rounds{' '}
                                {bLongest.startRound}&ndash;{bLongest.endRound})
                              </Text>
                            )}
                          </HStack>

                          <HStack gap={2} align="center" flexWrap="wrap">
                            <Text fontSize="xs" color="fg.muted">
                              Last {recentForm.length} shared arenas:
                            </Text>
                            <HStack gap={1}>
                              {recentForm.map(encounter => (
                                <Tooltip
                                  key={`${encounter.round}-${encounter.arena}`}
                                  content={`Round ${encounter.round} (${ARENA_NAMES[encounter.arena]}): ${
                                    encounter.outcome === 'a'
                                      ? `${aName} won`
                                      : encounter.outcome === 'b'
                                        ? `${bName} won`
                                        : 'neither won'
                                  }`}
                                >
                                  <Box
                                    w="10px"
                                    h="10px"
                                    borderRadius="2px"
                                    bg={
                                      encounter.outcome === 'a'
                                        ? MATCHUP_A_COLOR
                                        : encounter.outcome === 'b'
                                          ? MATCHUP_B_COLOR
                                          : MATCHUP_NEITHER_COLOR
                                    }
                                  />
                                </Tooltip>
                              ))}
                            </HStack>
                            {(aCurrent || bCurrent) && (
                              <Text fontSize="xs" color="fg.muted">
                                {aCurrent
                                  ? `${aName} is on a ${aCurrent.count}-arena win streak`
                                  : `${bName} is on a ${bCurrent!.count}-arena win streak`}
                              </Text>
                            )}
                          </HStack>
                        </Stack>
                      </Card.Body>
                    </Card.Root>

                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                      <MatchupSplitDoughnut
                        aName={aName}
                        bName={bName}
                        aWins={summary.aWins}
                        bWins={summary.bWins}
                        neitherCount={summary.neitherCount}
                      />
                      <MatchupArenaBarChart aName={aName} bName={bName} breakdown={breakdown} />
                    </SimpleGrid>

                    <MatchupTrendChart aName={aName} bName={bName} encounters={visibleEncounters} />

                    <Text fontSize="xs" color="fg.muted">
                      {pirateFullName(pirateAId)} vs. {pirateFullName(pirateBId)}. Shared-arena
                      counts include every completed round in the selected range;
                      &quot;neither&quot; means one of the other two pirates in that arena took it.
                    </Text>
                  </>
                )}
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
}
