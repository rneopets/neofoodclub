import {
  Box,
  Button,
  Card,
  CloseButton,
  Code,
  Dialog,
  HStack,
  Link,
  Portal,
  SimpleGrid,
  Stack,
  Table,
  Text,
  useClipboard,
} from '@chakra-ui/react';
import { format } from 'date-fns';
import * as React from 'react';
import {
  FaCalendar,
  FaChartBar,
  FaChartPie,
  FaCheck,
  FaClipboardList,
  FaCopy,
  FaFileCsv,
  FaShapes,
  FaTrophy,
} from 'react-icons/fa';
import { FaCalendarDays, FaMagnifyingGlassChart, FaTriangleExclamation } from 'react-icons/fa6';
import { LuExternalLink } from 'react-icons/lu';

import {
  computeAdvancedStats,
  findMissedRoundGapsFromFeed,
  type FcDataAdvancedStats,
} from '../../analysis/fcDataAdvancedStats';
import {
  buildShareSummary,
  computeBetShapeCounts,
  computeCumulativeSeries,
  computeMonthlyStats,
  computeReturnDistribution,
  computeRoiSeries,
  computeRollingRoiSeries,
  computeTotals,
  computeYearlyStats,
  findBestAndWorstMonth,
  findMissedRoundGaps,
  ROLLING_ROI_WINDOW,
  type FcDataBetShapeCounts,
  type FcDataMissedRoundGap,
  type FcDataMonthHighlight,
  type FcDataMonthStats,
  type FcDataReturnBucket,
  type FcDataReturnDistribution,
  type FcDataTotals,
  type FcDataYearStats,
} from '../../analysis/fcDataStats';
import { parseFcDataCsv, type FcDataParseResult, type FcDataRow } from '../../data/fcDataCsv';
import { useBacktestPreviousRounds } from '../../hooks/useBacktestPreviousRounds';
import { FcDataBetShapesChart } from '../charts/FcDataBetShapesChart';
import { FcDataCumulativeChart } from '../charts/FcDataCumulativeChart';
import { FcDataMonthlyBarChart } from '../charts/FcDataMonthlyBarChart';
import { FcDataRoiChart } from '../charts/FcDataRoiChart';

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

function formatRoi(value: number): string {
  return `${value.toFixed(3)}x`;
}

function roiColor(value: number): string {
  return value >= 1 ? 'green.600' : 'orange.500';
}

function formatDateRange(start: Date, end: Date): string {
  const startLabel = format(start, 'MMM d, yyyy');
  if (start.getTime() === end.getTime()) {
    return startLabel;
  }
  return `${startLabel} - ${format(end, 'MMM d, yyyy')}`;
}

function SectionCard({
  title,
  icon: IconComponent,
  children,
}: {
  title: string;
  icon?: React.ComponentType;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <Card.Root boxShadow="sm">
      <Card.Body p={4}>
        <Stack gap={3}>
          <HStack gap={2}>
            {IconComponent && (
              <Box color="fg.muted" fontSize="sm">
                <IconComponent />
              </Box>
            )}
            <Text fontSize="sm" fontWeight="semibold" color="fg.muted" letterSpacing="wide">
              {title.toUpperCase()}
            </Text>
          </HStack>
          {children}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

function StatBlock({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
}): React.JSX.Element {
  return (
    <Stack gap={0}>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="lg" fontWeight="semibold" color={color}>
        {value}
      </Text>
      {sub && (
        <Text fontSize="xs" color="fg.muted">
          {sub}
        </Text>
      )}
    </Stack>
  );
}

function FcDataTotalsSection({ totals }: { totals: FcDataTotals }): React.JSX.Element {
  return (
    <SectionCard title="Overview" icon={FaClipboardList}>
      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <StatBlock label="Rounds recorded" value={totals.roundsRecorded.toLocaleString()} />
        <StatBlock
          label="Total units won"
          value={formatUnits(totals.totalUnitsWon)}
          color="nfc-blue.600"
        />
        <StatBlock
          label="ROI"
          value={formatRoi(totals.roi)}
          sub="units won per active bet line"
          color={roiColor(totals.roi)}
        />
        <StatBlock
          label="Win rate"
          value={displayPercent(totals.winRate)}
          color={totals.winRate >= 0.5 ? 'green.600' : 'orange.500'}
        />
        <StatBlock
          label="Longest win streak"
          value={
            totals.longestWinStreak
              ? `${totals.longestWinStreak.count.toLocaleString()} (${formatUnits(totals.longestWinStreak.totalUnitsWon)} units)`
              : '-'
          }
          sub={
            totals.longestWinStreak &&
            formatDateRange(totals.longestWinStreak.startDate, totals.longestWinStreak.endDate)
          }
          color="green.600"
        />
        <StatBlock
          label="Longest bust streak"
          value={totals.longestLossStreak ? totals.longestLossStreak.count.toLocaleString() : '-'}
          sub={
            totals.longestLossStreak &&
            formatDateRange(totals.longestLossStreak.startDate, totals.longestLossStreak.endDate)
          }
          color="red.500"
        />
        <StatBlock
          label="Current streak"
          value={
            totals.currentStreak
              ? `${totals.currentStreak.count.toLocaleString()} ${totals.currentStreak.type === 'win' ? 'win' : 'bust'}${totals.currentStreak.count === 1 ? '' : 's'}${
                  totals.currentStreak.type === 'win'
                    ? ` (${formatUnits(totals.currentStreak.totalUnitsWon)} units)`
                    : ''
                }`
              : '-'
          }
          sub={
            totals.currentStreak &&
            formatDateRange(totals.currentStreak.startDate, totals.currentStreak.endDate)
          }
          color={totals.currentStreak?.type === 'win' ? 'green.600' : 'red.500'}
        />
        <StatBlock
          label="Best round"
          value={
            totals.bestRound ? (
              <Link href={totals.bestRound.url} target="_blank" fontSize="lg">
                #{totals.bestRound.round} ({formatUnits(totals.bestRound.unitsWon)}){' '}
                <LuExternalLink />
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
    </SectionCard>
  );
}

function FcDataMonthHighlightSection({
  highlight,
}: {
  highlight: FcDataMonthHighlight;
}): React.JSX.Element | null {
  if (!highlight.best || !highlight.worst) {
    return null;
  }

  return (
    <SectionCard title="Best & Worst Month" icon={FaTrophy}>
      <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
        <Box
          borderRadius="md"
          p={3}
          bg="green.subtle"
          borderWidth="1px"
          borderColor="green.emphasized"
        >
          <Text fontSize="xs" color="fg.muted">
            Best month
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="green.fg">
            {highlight.best.label}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {formatUnits(highlight.best.totalUnitsWon)} units ·{' '}
            {displayPercent(highlight.best.winRate)} win rate
          </Text>
        </Box>
        <Box
          borderRadius="md"
          p={3}
          bg="orange.subtle"
          borderWidth="1px"
          borderColor="orange.emphasized"
        >
          <Text fontSize="xs" color="fg.muted">
            Worst month
          </Text>
          <Text fontSize="xl" fontWeight="bold" color="orange.fg">
            {highlight.worst.label}
          </Text>
          <Text fontSize="sm" color="fg.muted">
            {formatUnits(highlight.worst.totalUnitsWon)} units ·{' '}
            {displayPercent(highlight.worst.winRate)} win rate
          </Text>
        </Box>
      </SimpleGrid>
    </SectionCard>
  );
}

function FcDataYearlyTable({ years }: { years: FcDataYearStats[] }): React.JSX.Element | null {
  if (years.length < 2) {
    return null;
  }

  return (
    <SectionCard title="Yearly Breakdown" icon={FaCalendar}>
      <Table.Root size="sm" width="full">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader>Year</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Rounds</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Total Won</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Avg/Round</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Win Rate</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">ROI</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Best Round</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {years.map(year => (
            <Table.Row key={year.yearKey}>
              <Table.Cell fontWeight="medium">{year.label}</Table.Cell>
              <Table.Cell textAlign="right">{year.roundsPlayed.toLocaleString()}</Table.Cell>
              <Table.Cell textAlign="right">{formatUnits(year.totalUnitsWon)}</Table.Cell>
              <Table.Cell textAlign="right">{year.averageUnitsPerRound.toFixed(1)}</Table.Cell>
              <Table.Cell textAlign="right">{displayPercent(year.winRate)}</Table.Cell>
              <Table.Cell textAlign="right" color={roiColor(year.roi)} fontWeight="medium">
                {formatRoi(year.roi)}
              </Table.Cell>
              <Table.Cell textAlign="right">
                {year.bestRound && (
                  <Link href={year.bestRound.url} target="_blank" fontSize="sm">
                    #{year.bestRound.round} ({formatUnits(year.bestRound.unitsWon)}){' '}
                    <LuExternalLink />
                  </Link>
                )}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </SectionCard>
  );
}

const RETURN_BUCKET_ORDER: FcDataReturnBucket[] = ['bust', 'partial', 'profit', 'double'];

const RETURN_BUCKET_LABELS: Record<FcDataReturnBucket, string> = {
  bust: 'Bust',
  partial: 'Partial',
  profit: 'Profit',
  double: 'Double+',
};

const RETURN_BUCKET_COLORS: Record<FcDataReturnBucket, string> = {
  bust: '#e53e3e',
  partial: '#dd6b20',
  profit: '#38a169',
  double: '#3182ce',
};

function FcDataReturnDistributionSection({
  distribution,
}: {
  distribution: FcDataReturnDistribution;
}): React.JSX.Element | null {
  if (distribution.total === 0) {
    return null;
  }

  return (
    <SectionCard title="Return Distribution" icon={FaChartPie}>
      <Box h="20px" borderRadius="md" overflow="hidden" display="flex">
        {RETURN_BUCKET_ORDER.filter(bucket => distribution[bucket] > 0).map(bucket => (
          <Box
            key={bucket}
            bg={RETURN_BUCKET_COLORS[bucket]}
            flexBasis={`${(distribution[bucket] / distribution.total) * 100}%`}
          />
        ))}
      </Box>
      <Text fontSize="sm" color="fg.muted">
        {RETURN_BUCKET_ORDER.map(
          bucket =>
            `${RETURN_BUCKET_LABELS[bucket]} ${displayPercent(distribution[bucket] / distribution.total)}`,
        ).join(' · ')}
      </Text>
      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
        Per round, relative to that round&apos;s active bet lines: Bust = won nothing, Partial =
        under 1x, Profit = 1x-2x, Double+ = 2x or more.
      </Text>
    </SectionCard>
  );
}

function FcDataMonthlyTable({ months }: { months: FcDataMonthStats[] }): React.JSX.Element {
  return (
    <SectionCard title="Per-Month Breakdown" icon={FaCalendarDays}>
      <Box maxH="280px" overflowY="auto">
        <Table.Root size="sm" width="full">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader>Month</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Rounds</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Total Won</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Avg/Round</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Win Rate</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">ROI</Table.ColumnHeader>
              <Table.ColumnHeader textAlign="right">Running ROI</Table.ColumnHeader>
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
                <Table.Cell textAlign="right" color={roiColor(month.roi)} fontWeight="medium">
                  {formatRoi(month.roi)}
                </Table.Cell>
                <Table.Cell textAlign="right" color={roiColor(month.cumulativeRoi)}>
                  {formatRoi(month.cumulativeRoi)}
                </Table.Cell>
                <Table.Cell textAlign="right">
                  {month.bestRound && (
                    <Link href={month.bestRound.url} target="_blank" fontSize="sm">
                      #{month.bestRound.round} ({formatUnits(month.bestRound.unitsWon)}){' '}
                      <LuExternalLink />
                    </Link>
                  )}
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
        ROI is units won per active bet line (not real NP wagered - the CSV has no bet amounts),
        where 1.000x means breaking even. Running ROI accumulates from the first recorded round
        through the end of that month.
      </Text>
    </SectionCard>
  );
}

function FcDataMissedRoundsSection({
  gaps,
  rowsByRound,
  isValidated,
}: {
  gaps: FcDataMissedRoundGap[];
  rowsByRound: Map<number, FcDataRow>;
  isValidated: boolean;
}): React.JSX.Element | null {
  if (gaps.length === 0) {
    return null;
  }

  return (
    <SectionCard title="Missed Rounds" icon={FaTriangleExclamation}>
      <Text fontSize="sm" color="fg.muted">
        {gaps.length} gap{gaps.length === 1 ? '' : 's'} where one or more rounds weren&apos;t
        recorded
      </Text>
      {!isValidated && (
        <Text fontSize="xs" color="fg.muted" fontStyle="italic">
          Based on round numbers only - some of these rounds may never have run. Load Detailed Stats
          to check against the round history feed.
        </Text>
      )}
      <Stack gap={1} maxH="180px" overflowY="auto">
        {gaps.map(gap => {
          const afterUrl = rowsByRound.get(gap.afterRound)?.url;
          const beforeUrl = rowsByRound.get(gap.beforeRound)?.url;
          return (
            <Text key={`${gap.afterRound}-${gap.beforeRound}`} fontSize="sm" color="fg.muted">
              {gap.missingCount} round{gap.missingCount === 1 ? '' : 's'} missed between{' '}
              {afterUrl ? (
                <Link href={afterUrl} target="_blank" fontSize="sm">
                  #{gap.afterRound} <LuExternalLink />
                </Link>
              ) : (
                `#${gap.afterRound}`
              )}{' '}
              and{' '}
              {beforeUrl ? (
                <Link href={beforeUrl} target="_blank" fontSize="sm">
                  #{gap.beforeRound} <LuExternalLink />
                </Link>
              ) : (
                `#${gap.beforeRound}`
              )}
            </Text>
          );
        })}
      </Stack>
    </SectionCard>
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

const EXPOSURE_BAR_COLOR = '#3182ce';

function PirateExposureBar({
  name,
  rate,
  maxRate,
}: {
  name: string;
  rate: number;
  maxRate: number;
}): React.JSX.Element {
  return (
    <HStack gap={2}>
      <Text fontSize="sm" w="120px" flexShrink={0} truncate>
        {name}
      </Text>
      <Box flex={1} h="14px" bg="bg.muted" borderRadius="sm" overflow="hidden">
        <Box h="full" bg={EXPOSURE_BAR_COLOR} w={`${(rate / maxRate) * 100}%`} />
      </Box>
      <Text fontSize="sm" w="46px" textAlign="right" flexShrink={0}>
        {displayPercent(rate)}
      </Text>
    </HStack>
  );
}

function FcDataAdvancedStatsSection({
  stats,
}: {
  stats: FcDataAdvancedStats;
}): React.JSX.Element | null {
  if (stats.fingerprint.matchedRounds === 0) {
    return null;
  }

  const allPirates = stats.pirateExposure;
  const maxRate = Math.max(...allPirates.map(p => p.roundParticipationRate), 0.01);
  const maxArenaRate = Math.max(...stats.arenaUsage.map(a => a.lineParticipationRate), 0.01);

  return (
    <SectionCard title="Advanced Stats (from round history)" icon={FaMagnifyingGlassChart}>
      <Text fontSize="xs" color="fg.muted">
        Decoded from {stats.fingerprint.matchedRounds.toLocaleString()} round
        {stats.fingerprint.matchedRounds === 1 ? '' : 's'} matched against the round history feed
        {stats.fingerprint.unmatchedRounds > 0
          ? ` (${stats.fingerprint.unmatchedRounds.toLocaleString()} not found)`
          : ''}
        .
      </Text>

      <SimpleGrid columns={{ base: 2, md: 4 }} gap={4}>
        <StatBlock
          label="Avg pirates/line"
          value={stats.fingerprint.averagePiratesPerLine.toFixed(2)}
        />
        <StatBlock
          label="Avg unique pirates/round"
          value={stats.fingerprint.averageUniquePiratesPerRound.toFixed(1)}
        />
        <StatBlock
          label="Favorite anchor pirate"
          value={stats.favoriteAnchorPirate ? stats.favoriteAnchorPirate.name : '-'}
          sub={
            stats.favoriteAnchorPirate &&
            `in every line, ${displayPercent(stats.favoriteAnchorPirate.share)} of rounds`
          }
        />
      </SimpleGrid>

      {allPirates.length > 0 && (
        <Stack gap={2}>
          <Text fontSize="sm" fontWeight="medium">
            Most bet pirates:
          </Text>
          <Stack gap={1}>
            {allPirates.map(pirate => (
              <PirateExposureBar
                key={pirate.pirateId}
                name={pirate.name}
                rate={pirate.roundParticipationRate}
                maxRate={maxRate}
              />
            ))}
          </Stack>
          <Text fontSize="xs" color="fg.muted" fontStyle="italic">
            Percent of rounds where you had that pirate in at least one bet line.
          </Text>
        </Stack>
      )}

      <Stack gap={2}>
        <Text fontSize="sm" fontWeight="medium">
          Arena usage:
        </Text>
        <Stack gap={1}>
          {stats.arenaUsage.map(arena => (
            <PirateExposureBar
              key={arena.arenaIndex}
              name={arena.name}
              rate={arena.lineParticipationRate}
              maxRate={maxArenaRate}
            />
          ))}
        </Stack>
      </Stack>
    </SectionCard>
  );
}

function FcDataBetShapesSection({
  shapes,
}: {
  shapes: FcDataBetShapeCounts;
}): React.JSX.Element | null {
  if (shapes.total === 0) {
    return null;
  }

  return (
    <SectionCard title="Bet Shapes" icon={FaShapes}>
      <FcDataBetShapesChart shapes={shapes} />
      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
        Gambit-shaped: every line is a subset of one fixed 5-pirate combo. Bustproof-shaped: some
        arena has all 4 of its pirates covered. Crazy-shaped: every line picks a pirate in all 5
        arenas. Tenbet-shaped: one pirate is held fixed across every line while the rest vary.
      </Text>
    </SectionCard>
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
  const years = React.useMemo(() => computeYearlyStats(rows), [rows]);
  const monthHighlight = React.useMemo(() => findBestAndWorstMonth(months), [months]);
  const cumulativeSeries = React.useMemo(() => computeCumulativeSeries(rows), [rows]);
  const roiSeries = React.useMemo(() => computeRoiSeries(rows), [rows]);
  const rollingRoiSeries = React.useMemo(() => computeRollingRoiSeries(rows), [rows]);
  const returnDistribution = React.useMemo(() => computeReturnDistribution(rows), [rows]);
  const betShapeCounts = React.useMemo(() => computeBetShapeCounts(rows), [rows]);
  const rowsByRound = React.useMemo(() => new Map(rows.map(row => [row.round, row])), [rows]);

  const shareSummary = React.useMemo(() => buildShareSummary(totals), [totals]);
  const { copy: copySummary } = useClipboard({ value: shareSummary });
  const [summaryCopied, setSummaryCopied] = React.useState(false);
  const handleCopySummary = React.useCallback((): void => {
    copySummary();
    setSummaryCopied(true);
    setTimeout(() => setSummaryCopied(false), 1500);
  }, [copySummary]);

  const [advancedStatsRequested, setAdvancedStatsRequested] = React.useState(false);
  const feed = useBacktestPreviousRounds({ enabled: advancedStatsRequested });
  const feedRoundsByNumber = React.useMemo(
    () => new Map(feed.rounds.map(r => [r.round, r])),
    [feed.rounds],
  );
  const isFeedReady = feed.status === 'ready' && feedRoundsByNumber.size > 0;

  const missedRoundGaps = React.useMemo(
    () =>
      isFeedReady
        ? findMissedRoundGapsFromFeed(rows, feedRoundsByNumber)
        : findMissedRoundGaps(rows),
    [rows, isFeedReady, feedRoundsByNumber],
  );

  const [advancedStats, setAdvancedStats] = React.useState<FcDataAdvancedStats | null>(null);
  const lastComputedRef = React.useRef<{ rows: FcDataRow[]; newestRound: number } | null>(null);

  React.useEffect(() => {
    if (feed.status !== 'ready') {
      return;
    }
    const last = lastComputedRef.current;
    if (last && last.rows === rows && last.newestRound === feed.newestRound) {
      return;
    }
    setAdvancedStats(computeAdvancedStats(rows, feedRoundsByNumber));
    lastComputedRef.current = { rows, newestRound: feed.newestRound };
  }, [feed.status, feed.newestRound, rows, feedRoundsByNumber]);

  const handleLoadAdvancedStats = React.useCallback((): void => {
    setAdvancedStatsRequested(true);
  }, []);

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
                  personal NeoFoodClub betting history. Everything is processed locally in your
                  browser - your file is never uploaded anywhere.
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
                      <HStack gap={2}>
                        <Button
                          size="xs"
                          variant="outline"
                          colorPalette={summaryCopied ? 'nfc-green' : undefined}
                          onClick={handleCopySummary}
                        >
                          {summaryCopied ? <FaCheck /> : <FaCopy />}
                          {summaryCopied ? 'Copied!' : 'Copy Summary'}
                        </Button>
                        <Button size="xs" variant="outline" onClick={handleLoadAnother}>
                          Load another file
                        </Button>
                      </HStack>
                    </HStack>

                    {!advancedStatsRequested && (
                      <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <Text fontSize="xs" color="fg.muted">
                          Pirate/arena exposure and bet-shape stats need the full round history
                          (~13MB, cached).
                        </Text>
                        <Button size="xs" variant="outline" onClick={handleLoadAdvancedStats}>
                          <FaChartBar />
                          Load Detailed Stats
                        </Button>
                      </HStack>
                    )}
                    {advancedStatsRequested && feed.status === 'loading' && (
                      <Text fontSize="xs" color="fg.muted">
                        Downloading round history (~13MB)...
                      </Text>
                    )}
                    {advancedStatsRequested && feed.status === 'error' && (
                      <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <Text fontSize="xs" color="fg.error">
                          {feed.error ?? 'Failed to load round history.'}
                        </Text>
                        <Button size="xs" variant="outline" onClick={() => feed.refetch()}>
                          Retry
                        </Button>
                      </HStack>
                    )}
                    {advancedStatsRequested && feed.status === 'ready' && (
                      <HStack justify="space-between" flexWrap="wrap" gap={2}>
                        <Text fontSize="xs" color="fg.muted">
                          Round history loaded (newest #{feed.newestRound.toLocaleString()}).
                        </Text>
                        <Button size="xs" variant="outline" onClick={() => feed.refetch()}>
                          Refresh round history
                        </Button>
                      </HStack>
                    )}

                    {advancedStats && <FcDataAdvancedStatsSection stats={advancedStats} />}

                    <FcDataWarningsSection warnings={state.result.warnings} />

                    <FcDataTotalsSection totals={totals} />

                    <FcDataMonthHighlightSection highlight={monthHighlight} />

                    <FcDataReturnDistributionSection distribution={returnDistribution} />

                    <FcDataBetShapesSection shapes={betShapeCounts} />

                    <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                      <FcDataCumulativeChart series={cumulativeSeries} />
                      <FcDataRoiChart
                        series={roiSeries}
                        rollingSeries={rollingRoiSeries}
                        rollingLabel={`${ROLLING_ROI_WINDOW}-round avg`}
                      />
                    </SimpleGrid>

                    <FcDataMonthlyBarChart months={months} />

                    <FcDataYearlyTable years={years} />

                    <FcDataMonthlyTable months={months} />

                    <FcDataMissedRoundsSection
                      gaps={missedRoundGaps}
                      rowsByRound={rowsByRound}
                      isValidated={isFeedReady}
                    />
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
