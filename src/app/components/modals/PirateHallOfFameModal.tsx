import {
  Badge,
  Button,
  CloseButton,
  Dialog,
  HStack,
  Portal,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';
import { FaTrophy } from 'react-icons/fa';

import {
  computePirateHallOfFame,
  type PirateHallOfFameEntry,
} from '../../analysis/pirateHallOfFame';
import { useBacktestPreviousRounds } from '../../hooks/useBacktestPreviousRounds';

interface PirateHallOfFameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function displayPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function StreakCell({ streak }: { streak: number }): React.JSX.Element {
  return (
    <HStack gap={1} justify="flex-end">
      {streak > 0 && (
        <Badge colorPalette="orange" size="sm">
          on fire
        </Badge>
      )}
      <Text>{streak}</Text>
    </HStack>
  );
}

export const PirateHallOfFameModal: React.FC<PirateHallOfFameModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { status, rounds, newestRound, error, refetch } = useBacktestPreviousRounds({
    enabled: isOpen,
  });

  const entries = React.useMemo(
    () => (status === 'ready' ? computePirateHallOfFame(rounds) : []),
    [status, rounds],
  );

  const totalRounds = status === 'ready' ? rounds.length : 0;
  // The round the streaks are measured against - the newest completed round.
  const asOfRound = status === 'ready' ? Math.max(...rounds.map(r => r.round), 0) : 0;

  const statusText = React.useMemo(() => {
    if (status === 'loading') {
      return 'Downloading previous.jsonl (~13MB)...';
    }
    if (status === 'error') {
      return error ?? 'Failed to load round history.';
    }
    if (status === 'ready') {
      return `${totalRounds} completed rounds (newest #${newestRound}).`;
    }
    return '';
  }, [status, error, totalRounds, newestRound]);

  const rows: Array<{ key: number; entry: PirateHallOfFameEntry }> = entries.map(entry => ({
    key: entry.pirateId,
    entry,
  }));

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
              <HStack>
                <FaTrophy />
                <Text fontWeight="semibold">Pirate Hall of Fame</Text>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Win statistics across every completed round: how often each pirate wins an arena,
                  their last win, and their current/highest streaks of consecutive winning rounds. A
                  pirate counts as &quot;on&quot; for a round if they win at least one arena in it.
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

                {status === 'ready' && totalRounds > 0 && (
                  <Table.Root size="sm" width="full">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Pirate</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Win %</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Rounds Won</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Last Win</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Streak</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Highest Streak</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {rows.map(({ key, entry }) => (
                        <Table.Row key={key}>
                          <Table.Cell>
                            <HStack gap={2}>
                              <Text fontWeight="medium">{entry.name}</Text>
                              <Text fontSize="xs" color="fg.muted">
                                #{entry.pirateId}
                              </Text>
                            </HStack>
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            {displayPercent(entry.winPercent)}
                          </Table.Cell>
                          <Table.Cell textAlign="right">{entry.wins}</Table.Cell>
                          <Table.Cell textAlign="right">
                            {entry.lastWinRound !== null ? `#${entry.lastWinRound}` : '—'}
                          </Table.Cell>
                          <Table.Cell textAlign="right">
                            <StreakCell streak={entry.currentStreak} />
                          </Table.Cell>
                          <Table.Cell textAlign="right">{entry.highestStreak}</Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}

                {status === 'ready' && totalRounds > 0 && (
                  <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                    Streaks are measured as of round #{asOfRound}. Win % is a pirate&apos;s arena
                    wins divided by the total number of completed rounds - since each round has five
                    arenas, 100% means winning one arena in every single round.
                  </Text>
                )}

                {status === 'ready' && totalRounds === 0 && (
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
