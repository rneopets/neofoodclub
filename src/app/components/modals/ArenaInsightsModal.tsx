import {
  Box,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Progress,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';

import {
  computeArenaPositionWinRates,
  positiveArenaDistribution,
} from '../../analysis/arenaInsights';
import type { BacktestRound } from '../../backtest/types';
import { useBacktestPreviousRounds } from '../../hooks/useBacktestPreviousRounds';

import { Tooltip } from '@/components/ui/tooltip';

interface ArenaInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function displayPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function PositiveArenasSection({ rounds }: { rounds: BacktestRound[] }): React.JSX.Element | null {
  const distribution = React.useMemo(() => positiveArenaDistribution(rounds), [rounds]);

  if (distribution.totalRounds === 0) {
    return null;
  }

  const maxBucket = Math.max(...distribution.buckets, 1);

  // Fixed positional buckets (0-5 positive arenas) - the label is a stable,
  // meaningful key for each row.
  const rows = distribution.buckets.map((count, positiveCount) => ({
    key: `${positiveCount}-positive`,
    label: `${positiveCount} positive`,
    count,
  }));

  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        Positive-arena breakdown:
      </Text>
      <Table.Root size="sm" width="full">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader width="140px">Positive arenas</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Rounds</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Share</Table.ColumnHeader>
            <Table.ColumnHeader width="35%" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map(row => (
            <Table.Row key={row.key}>
              <Table.Cell>{row.label}</Table.Cell>
              <Table.Cell textAlign="right">{row.count.toLocaleString()}</Table.Cell>
              <Table.Cell textAlign="right">
                {displayPercent(row.count / distribution.totalRounds)}
              </Table.Cell>
              <Table.Cell p={2}>
                <Progress.Root
                  value={(row.count / maxBucket) * 100}
                  size="xs"
                  colorPalette="nfc-blue"
                >
                  <Progress.Track>
                    <Progress.Range />
                  </Progress.Track>
                </Progress.Root>
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
        An arena is positive when the sum of 1/odds across its four pirates is under 1 - the
        book&apos;s implied probability totals below 100%. Rounds with few positive arenas are where
        bustproof-style betting has nothing to work with.
      </Text>
    </Stack>
  );
}

const POSITION_COLOR_PALETTES = ['nfc-cyan', 'nfc-green', 'nfc-orange', 'nfc-purple'] as const;

function ArenaPositionBarRow({
  row,
}: {
  row: ReturnType<typeof computeArenaPositionWinRates>['overall'];
}): React.JSX.Element {
  const isOverall = row.arenaIndex === -1;

  return (
    <HStack gap={3} align="center">
      <Text
        fontSize="sm"
        fontWeight={isOverall ? 'semibold' : undefined}
        width="90px"
        flexShrink={0}
      >
        {row.arenaName}
      </Text>
      <Box
        flex="1"
        display="flex"
        overflow="hidden"
        borderRadius="md"
        border="1px solid"
        borderColor="border"
        minH="7"
      >
        {row.positionCounts.map((count, i) => {
          const share = count / row.totalRounds;
          const percent = share * 100;

          if (percent <= 0) {
            return null;
          }

          return (
            <Tooltip
              key={`position-${i + 1}`}
              content={`Position ${i + 1}: ${displayPercent(share)}`}
              showArrow
              placement="top"
            >
              <Box
                width={`${percent}%`}
                layerStyle="fill.muted"
                colorPalette={POSITION_COLOR_PALETTES[i]}
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xs"
                fontWeight="semibold"
                whiteSpace="nowrap"
                overflow="hidden"
                minH="7"
              >
                {percent > 8 ? displayPercent(share) : ' '}
              </Box>
            </Tooltip>
          );
        })}
      </Box>
    </HStack>
  );
}

function ArenaPositionWinRateSection({
  rounds,
}: {
  rounds: BacktestRound[];
}): React.JSX.Element | null {
  const { arenas, overall } = React.useMemo(() => computeArenaPositionWinRates(rounds), [rounds]);

  if (overall.totalRounds === 0) {
    return null;
  }

  const allRows = [...arenas, overall];

  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        Win rate by arena position:
      </Text>
      <HStack gap={4} flexWrap="wrap">
        {POSITION_COLOR_PALETTES.map((palette, i) => (
          <HStack key={palette} gap={1}>
            <Box w="3" h="3" borderRadius="sm" layerStyle="fill.muted" colorPalette={palette} />
            <Text fontSize="xs" color="fg.muted">
              Position {i + 1}
            </Text>
          </HStack>
        ))}
      </HStack>
      <Stack gap={2}>
        {allRows.map(row => (
          <ArenaPositionBarRow key={row.arenaIndex} row={row} />
        ))}
      </Stack>
      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
        Share of rounds each arena&apos;s winner came from position 1-4 (the pirate&apos;s 1-indexed
        slot within the arena). &quot;Overall&quot; aggregates across all five arenas.
      </Text>
    </Stack>
  );
}

export const ArenaInsightsModal: React.FC<ArenaInsightsModalProps> = ({ isOpen, onClose }) => {
  const { status, rounds, newestRound, error, refetch } = useBacktestPreviousRounds({
    enabled: isOpen,
  });

  const statusText = React.useMemo(() => {
    if (status === 'loading') {
      return 'Downloading previous.jsonl (~13MB)...';
    }
    if (status === 'error') {
      return error ?? 'Failed to load round history.';
    }
    if (status === 'ready') {
      return `${rounds.length} completed rounds loaded (newest #${newestRound}).`;
    }
    return '';
  }, [status, error, rounds.length, newestRound]);

  const hasResults = status === 'ready' && rounds.length > 0;

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
      size="xl"
      preventScroll
      modal
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>Arena Insights</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Structural stats about the game itself, computed across every completed round on
                  the CDN feed: how often arenas are positive, and how often each position within an
                  arena wins it.
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

                {hasResults && (
                  <>
                    <PositiveArenasSection rounds={rounds} />
                    <ArenaPositionWinRateSection rounds={rounds} />
                  </>
                )}

                {status === 'ready' && rounds.length === 0 && (
                  <Text fontSize="sm" color="fg.muted">
                    No completed rounds loaded.
                  </Text>
                )}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
