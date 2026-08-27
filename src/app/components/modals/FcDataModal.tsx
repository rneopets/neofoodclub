import {
  Box,
  Button,
  CloseButton,
  Code,
  Dialog,
  HStack,
  Link,
  Portal,
  Progress,
  SimpleGrid,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import * as React from 'react';
import { FaFileCsv } from 'react-icons/fa';

import {
  computeCumulativeSeries,
  computeDayOfWeekStats,
  computeMonthlyStats,
  computeTotals,
  findMissedRoundGaps,
  type FcDataDayOfWeekStats,
  type FcDataMissedRoundGap,
  type FcDataMonthStats,
  type FcDataTotals,
} from '../../analysis/fcDataStats';
import { parseFcDataCsv, type FcDataParseResult, type FcDataRow } from '../../data/fcDataCsv';
import { FcDataCumulativeChart } from '../charts/FcDataCumulativeChart';
import { FcDataMonthlyBarChart } from '../charts/FcDataMonthlyBarChart';

interface FcDataModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FcDataLoadState =
  | { status: 'empty' }
  | { status: 'loaded'; fileName: string; result: FcDataParseResult }
  | { status: 'error'; fileName: string; message: string };

function formatUnits(value: number): string {
  return Math.round(value).toLocaleString();
}

function displayPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function StatBlock({ label, value }: { label: string; value: React.ReactNode }): React.JSX.Element {
  return (
    <Stack gap={0}>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="semibold">
        {value}
      </Text>
    </Stack>
  );
}

function FcDataTotalsSection({ totals }: { totals: FcDataTotals }): React.JSX.Element {
  return (
    <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
      <StatBlock label="Rounds recorded" value={totals.roundsRecorded.toLocaleString()} />
      <StatBlock label="Total units won" value={formatUnits(totals.totalUnitsWon)} />
      <StatBlock label="Average per round" value={totals.averageUnitsPerRound.toFixed(1)} />
      <StatBlock label="Win rate" value={displayPercent(totals.winRate)} />
      <StatBlock label="Longest win streak" value={totals.longestWinStreak.toLocaleString()} />
      <StatBlock label="Longest loss streak" value={totals.longestLossStreak.toLocaleString()} />
      <StatBlock
        label="Best round"
        value={
          totals.bestRound ? (
            <Link href={totals.bestRound.url} target="_blank" fontSize="lg">
              #{totals.bestRound.round} ({formatUnits(totals.bestRound.unitsWon)})
            </Link>
          ) : (
            '-'
          )
        }
      />
      <StatBlock
        label="Date range"
        value={
          totals.firstRound && totals.lastRound
            ? `${format(totals.firstRound.date, 'MMM d, yyyy')} - ${format(totals.lastRound.date, 'MMM d, yyyy')}`
            : '-'
        }
      />
    </SimpleGrid>
  );
}

function FcDataMonthlyTable({ months }: { months: FcDataMonthStats[] }): React.JSX.Element {
  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        Per-month breakdown:
      </Text>
      <Box maxH="280px" overflowY="auto">
        <Table.Root size="sm" width="full">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Month</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Rounds</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Total Won</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Avg/Round</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Win Rate</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Best Round</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {months.map(month => (
              <Table.Row key={month.monthKey}>
                <Table.Cell>{month.label}</Table.Cell>
                <Table.Cell textAlign="right">{month.roundsPlayed.toLocaleString()}</Table.Cell>
                <Table.Cell textAlign="right">{formatUnits(month.totalUnitsWon)}</Table.Cell>
                <Table.Cell textAlign="right">{month.averageUnitsPerRound.toFixed(1)}</Table.Cell>
                <Table.Cell textAlign="right">{displayPercent(month.winRate)}</Table.Cell>
                <Table.Cell textAlign="right">
                  {month.bestRound && (
                    <Link href={month.bestRound.url} target="_blank" fontSize="sm">
                      #{month.bestRound.round} ({formatUnits(month.bestRound.unitsWon)})
                    </Link>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </Stack>
  );
}

function FcDataDayOfWeekSection({ days }: { days: FcDataDayOfWeekStats[] }): React.JSX.Element {
  const maxAverage = Math.max(...days.map(day => day.averageUnitsPerRound), 1);

  return (
    <Stack gap={2}>
      <Text fontSize="sm" fontWeight="medium">
        By day of week:
      </Text>
      <Table.Root size="sm" width="full">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader width="60px">Day</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Rounds</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Avg/Round</Table.ColumnHeader>
            <Table.ColumnHeader width="40%" />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {days.map(day => (
            <Table.Row key={day.dayOfWeek}>
              <Table.Cell>{day.label}</Table.Cell>
              <Table.Cell textAlign="right">{day.roundsPlayed.toLocaleString()}</Table.Cell>
              <Table.Cell textAlign="right">{day.averageUnitsPerRound.toFixed(1)}</Table.Cell>
              <Table.Cell p={2}>
                <Progress.Root
                  value={(day.averageUnitsPerRound / maxAverage) * 100}
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
    </Stack>
  );
}

function FcDataMissedRoundsSection({
  gaps,
  rowsByRound,
}: {
  gaps: FcDataMissedRoundGap[];
  rowsByRound: Map<number, FcDataRow>;
}): React.JSX.Element | null {
  if (gaps.length === 0) {
    return null;
  }

  return (
    <Stack gap={2}>
      <HStack>
        <Text fontSize="sm" fontWeight="medium">
          Missed rounds:
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {gaps.length} gap{gaps.length === 1 ? '' : 's'} where one or more rounds weren&apos;t
          recorded
        </Text>
      </HStack>
      <Stack gap={1} maxH="180px" overflowY="auto">
        {gaps.map(gap => {
          const afterUrl = rowsByRound.get(gap.afterRound)?.url;
          const beforeUrl = rowsByRound.get(gap.beforeRound)?.url;
          return (
            <Text key={`${gap.afterRound}-${gap.beforeRound}`} fontSize="sm" color="fg.muted">
              {gap.missingCount} round{gap.missingCount === 1 ? '' : 's'} missed between{' '}
              {afterUrl ? (
                <Link href={afterUrl} target="_blank" fontSize="sm">
                  #{gap.afterRound}
                </Link>
              ) : (
                `#${gap.afterRound}`
              )}{' '}
              and{' '}
              {beforeUrl ? (
                <Link href={beforeUrl} target="_blank" fontSize="sm">
                  #{gap.beforeRound}
                </Link>
              ) : (
                `#${gap.beforeRound}`
              )}
            </Text>
          );
        })}
      </Stack>
    </Stack>
  );
}

function FcDataWarningsSection({
  warnings,
}: {
  warnings: FcDataParseResult['warnings'];
}): React.JSX.Element | null {
  if (warnings.length === 0) {
    return null;
  }

  return (
    <Stack gap={1}>
      <Text fontSize="xs" color="fg.muted">
        {warnings.length} row{warnings.length === 1 ? '' : 's'} skipped while parsing:
      </Text>
      <Stack gap={0} maxH="100px" overflowY="auto">
        {warnings.map(warning => (
          <Text key={warning.line} fontSize="xs" color="fg.muted" fontFamily="mono">
            line {warning.line}: {warning.reason}
          </Text>
        ))}
      </Stack>
    </Stack>
  );
}

function DropZone({
  isDragOver,
  onDrop,
  onDragOver,
  onDragLeave,
  onBrowseClick,
}: {
  isDragOver: boolean;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onBrowseClick: () => void;
}): React.JSX.Element {
  return (
    <Box
      borderWidth="2px"
      borderStyle="dashed"
      borderColor={isDragOver ? 'nfc-blue.500' : 'border'}
      bg={isDragOver ? 'nfc-blue.50' : undefined}
      borderRadius="md"
      p={8}
      textAlign="center"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
    >
      <Stack gap={3} align="center">
        <FaFileCsv size={32} />
        <Text fontSize="sm" color="fg.muted">
          Drag and drop your fc_data.csv file here
        </Text>
        <Button size="sm" variant="outline" onClick={onBrowseClick}>
          Browse...
        </Button>
      </Stack>
    </Box>
  );
}

export function FcDataModal({ isOpen, onClose }: FcDataModalProps): React.JSX.Element {
  const [state, setState] = React.useState<FcDataLoadState>({ status: 'empty' });
  const [isDragOver, setIsDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadFile = React.useCallback((file: File): void => {
    const reader = new FileReader();
    reader.onload = (): void => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const result = parseFcDataCsv(text);
      if (result.rows.length === 0) {
        setState({ status: 'error', fileName: file.name, message: 'No valid rows found in file.' });
        return;
      }
      setState({ status: 'loaded', fileName: file.name, result });
    };
    reader.onerror = (): void => {
      setState({ status: 'error', fileName: file.name, message: 'Failed to read file.' });
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>): void => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        loadFile(file);
      }
    },
    [loadFile],
  );

  const handleDragOver = React.useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = React.useCallback((): void => {
    setIsDragOver(false);
  }, []);

  const handleBrowseClick = React.useCallback((): void => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (file) {
        loadFile(file);
      }
      e.target.value = '';
    },
    [loadFile],
  );

  const handleLoadAnother = React.useCallback((): void => {
    setState({ status: 'empty' });
  }, []);

  const rows = React.useMemo(() => (state.status === 'loaded' ? state.result.rows : []), [state]);

  const totals = React.useMemo(() => computeTotals(rows), [rows]);
  const months = React.useMemo(() => computeMonthlyStats(rows), [rows]);
  const cumulativeSeries = React.useMemo(() => computeCumulativeSeries(rows), [rows]);
  const dayOfWeekStats = React.useMemo(() => computeDayOfWeekStats(rows), [rows]);
  const missedRoundGaps = React.useMemo(() => findMissedRoundGaps(rows), [rows]);
  const rowsByRound = React.useMemo(() => new Map(rows.map(row => [row.round, row])), [rows]);

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
              <Dialog.Title>FC Data Visualizer</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Drop in a fc_data.csv export from NeoBot (the r/Neopets Discord bot's{' '}
                  <Code fontSize="sm">?fcdata</Code> command) to see charts and stats about your
                  personal NeoFoodClub betting history.
                </Text>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  hidden
                  onChange={handleFileInputChange}
                />

                {state.status !== 'loaded' && (
                  <DropZone
                    isDragOver={isDragOver}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onBrowseClick={handleBrowseClick}
                  />
                )}

                {state.status === 'error' && (
                  <Text fontSize="sm" color="fg.error">
                    {state.fileName}: {state.message}
                  </Text>
                )}

                {state.status === 'loaded' && (
                  <>
                    <HStack justify="space-between" flexWrap="wrap" gap={2}>
                      <Text fontSize="sm" color="fg.muted">
                        {state.fileName}: {rows.length.toLocaleString()} round
                        {rows.length === 1 ? '' : 's'} loaded
                        {state.result.warnings.length > 0
                          ? ` (${state.result.warnings.length} skipped)`
                          : ''}
                        .
                      </Text>
                      <Button size="xs" variant="outline" onClick={handleLoadAnother}>
                        Load another file
                      </Button>
                    </HStack>

                    <FcDataWarningsSection warnings={state.result.warnings} />

                    <FcDataTotalsSection totals={totals} />

                    <FcDataCumulativeChart series={cumulativeSeries} />

                    <FcDataMonthlyBarChart months={months} />

                    <FcDataMonthlyTable months={months} />

                    <FcDataDayOfWeekSection days={dayOfWeekStats} />

                    <FcDataMissedRoundsSection gaps={missedRoundGaps} rowsByRound={rowsByRound} />
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
