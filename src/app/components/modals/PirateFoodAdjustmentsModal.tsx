import { Box, Button, CloseButton, Dialog, HStack, Portal, Stack, Text } from '@chakra-ui/react';
import * as React from 'react';
import { FaUtensils } from 'react-icons/fa';
import { List } from 'react-window';

import {
  computeFoodAdjustmentHistory,
  type FoodAdjustmentRoundRow,
  type PirateFoodAdjustmentColumn,
} from '../../analysis/foodAdjustments';
import { useBacktestPreviousRounds } from '../../hooks/useBacktestPreviousRounds';

interface PirateFoodAdjustmentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RowData {
  rows: FoodAdjustmentRoundRow[];
  pirates: PirateFoodAdjustmentColumn[];
}

const LABEL_WIDTH = '64px';
const COLUMN_WIDTH = '76px';

const Row = React.memo(
  ({ index, style, rows, pirates }: { index: number; style: React.CSSProperties } & RowData) => {
    const row = rows[index];
    if (!row) {
      return null;
    }

    return (
      <Box style={style} borderBottomWidth="1px">
        <HStack px={2} gap={1} fontSize="xs" flexWrap="nowrap" height="100%" align="center">
          <Text width={LABEL_WIDTH} textAlign="right" flexShrink={0} fontWeight="medium">
            #{row.round}
          </Text>
          {pirates.map(pirate => {
            const cell = row.cellsByPirateId.get(pirate.pirateId);
            return (
              <Text
                key={pirate.pirateId}
                width={COLUMN_WIDTH}
                flexShrink={0}
                textAlign="center"
                py={1}
                layerStyle="fill.subtle"
                colorPalette={cell?.isWinner ? 'nfc-green' : 'nfc-red'}
              >
                {cell?.fa ?? '-'}
              </Text>
            );
          })}
        </HStack>
      </Box>
    );
  },
);

Row.displayName = 'PirateFoodAdjustmentsRow';

export const PirateFoodAdjustmentsModal: React.FC<PirateFoodAdjustmentsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { status, rounds, newestRound, error, refetch } = useBacktestPreviousRounds({
    enabled: isOpen,
  });

  const history = React.useMemo(
    () => (status === 'ready' ? computeFoodAdjustmentHistory(rounds) : { pirates: [], rows: [] }),
    [status, rounds],
  );

  const rowProps = React.useMemo<RowData>(
    () => ({ rows: history.rows, pirates: history.pirates }),
    [history],
  );

  const statusText = React.useMemo(() => {
    if (status === 'loading') {
      return 'Downloading previous.jsonl (~13MB)...';
    }
    if (status === 'error') {
      return error ?? 'Failed to load round history.';
    }
    if (status === 'ready') {
      return `${history.rows.length} rounds (newest #${newestRound}).`;
    }
    return '';
  }, [status, error, history.rows.length, newestRound]);

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
              <HStack>
                <FaUtensils />
                <Text fontWeight="semibold">Pirate Streaks (Food Adjustments)</Text>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflow="hidden">
              <Stack gap={3} flex={1} minHeight={0}>
                <Text fontSize="sm" color="fg.muted" flexShrink={0}>
                  Each pirate&apos;s food adjustment (FA) per round - how much that round&apos;s
                  foods shifted their odds - colored by whether they won their arena that round. Win
                  % and Avg FA are computed across every loaded round.
                </Text>

                <HStack justify="space-between" flexWrap="wrap" gap={2} flexShrink={0}>
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

                {status === 'ready' && history.rows.length > 0 && (
                  <Box flex={1} minHeight={0} display="flex" flexDirection="column">
                    <Box
                      overflowX="auto"
                      flex={1}
                      minHeight={0}
                      display="flex"
                      flexDirection="column"
                    >
                      <Box borderBottomWidth="2px" fontWeight="bold" bg="bg.muted" flexShrink={0}>
                        <HStack
                          px={2}
                          py={2}
                          gap={1}
                          fontSize="xs"
                          flexWrap="nowrap"
                          minWidth="fit-content"
                        >
                          <Text width={LABEL_WIDTH} flexShrink={0}>
                            Round
                          </Text>
                          {history.pirates.map(pirate => (
                            <Text
                              key={pirate.pirateId}
                              width={COLUMN_WIDTH}
                              flexShrink={0}
                              textAlign="center"
                              truncate
                              title={pirate.name}
                            >
                              {pirate.name}
                            </Text>
                          ))}
                        </HStack>
                      </Box>

                      <Box borderBottomWidth="1px" fontSize="xs" flexShrink={0}>
                        <HStack px={2} py={1} gap={1} flexWrap="nowrap" minWidth="fit-content">
                          <Text width={LABEL_WIDTH} flexShrink={0} fontWeight="semibold">
                            Win %
                          </Text>
                          {history.pirates.map(pirate => (
                            <Text
                              key={pirate.pirateId}
                              width={COLUMN_WIDTH}
                              flexShrink={0}
                              textAlign="center"
                            >
                              {(pirate.winPercent * 100).toFixed(1)}%
                            </Text>
                          ))}
                        </HStack>
                        <HStack px={2} py={1} gap={1} flexWrap="nowrap" minWidth="fit-content">
                          <Text width={LABEL_WIDTH} flexShrink={0} fontWeight="semibold">
                            Avg FA
                          </Text>
                          {history.pirates.map(pirate => (
                            <Text
                              key={pirate.pirateId}
                              width={COLUMN_WIDTH}
                              flexShrink={0}
                              textAlign="center"
                            >
                              {pirate.averageFa !== null ? pirate.averageFa.toFixed(2) : '-'}
                            </Text>
                          ))}
                        </HStack>
                      </Box>

                      <Box flex={1} minHeight={0} minWidth="fit-content">
                        <List<RowData>
                          defaultHeight={420}
                          rowCount={history.rows.length}
                          rowHeight={28}
                          rowComponent={
                            Row as (
                              props: { index: number; style: React.CSSProperties } & RowData,
                            ) => React.ReactElement | null
                          }
                          rowProps={rowProps}
                        />
                      </Box>
                    </Box>
                  </Box>
                )}

                {status === 'ready' && history.rows.length === 0 && (
                  <Text fontSize="sm" color="fg.muted">
                    No completed rounds loaded.
                  </Text>
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
};
