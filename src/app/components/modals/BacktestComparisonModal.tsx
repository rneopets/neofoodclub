import {
  Badge,
  Button,
  Card,
  CloseButton,
  Dialog,
  HStack,
  Input,
  Portal,
  Progress,
  Stack,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';
import { FaBalanceScale } from 'react-icons/fa';

import { runFullBacktest } from '../../backtest/runBacktest';
import type { BacktestSummary, ModelBacktestResult } from '../../backtest/types';
import { useBacktestPreviousRounds } from '../../hooks/useBacktestPreviousRounds';
import { amountAbbreviation, formatDate } from '../../util';
import { BacktestComparisonChart } from '../charts/BacktestComparisonChart';

const BET_COUNT = 10;
const DEFAULT_BET_AMOUNT = 50000;

interface BacktestComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RunState {
  running: boolean;
  done: number;
  total: number;
  result: BacktestSummary | null;
  error: string | null;
}

const INITIAL_RUN_STATE: RunState = {
  running: false,
  done: 0,
  total: 0,
  result: null,
  error: null,
};

function displayPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function ModelSummaryCard({
  title,
  result,
  isWinner,
}: {
  title: string;
  result: ModelBacktestResult;
  isWinner: boolean;
}): React.JSX.Element {
  const winRate = result.roundsPlayed > 0 ? result.roundsWon / result.roundsPlayed : 0;

  return (
    <Card.Root boxShadow="md" flex="1" minW="0">
      <Card.Body p={3}>
        <Stack gap={1}>
          <HStack justify="space-between">
            <Text fontWeight="semibold">{title}</Text>
            {isWinner && (
              <Badge colorPalette="green" size="sm">
                Better
              </Badge>
            )}
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Total Spent
            </Text>
            <Text fontSize="sm">{amountAbbreviation(result.totalSpent)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Total Won
            </Text>
            <Text fontSize="sm">{amountAbbreviation(result.totalWon)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Net Profit
            </Text>
            <Text fontSize="sm">{amountAbbreviation(result.netProfit)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              ROI
            </Text>
            <Text fontSize="sm">{displayPercent(result.roi)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Win Rate
            </Text>
            <Text fontSize="sm">
              {displayPercent(winRate)} ({result.roundsWon}/{result.roundsPlayed})
            </Text>
          </HStack>
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

export const BacktestComparisonModal: React.FC<BacktestComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { status, rounds, newestRound, fetchedAt, error, refetch } = useBacktestPreviousRounds({
    enabled: isOpen,
  });

  const [betAmountInput, setBetAmountInput] = React.useState(String(DEFAULT_BET_AMOUNT));
  const [runState, setRunState] = React.useState<RunState>(INITIAL_RUN_STATE);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const betAmount = React.useMemo(() => {
    const value = Number(betAmountInput);
    return !isNaN(value) && value > 0 ? value : DEFAULT_BET_AMOUNT;
  }, [betAmountInput]);

  const handleRunBacktest = React.useCallback((): void => {
    if (rounds.length === 0) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunState({ running: true, done: 0, total: rounds.length, result: null, error: null });

    void runFullBacktest(rounds, {
      betAmount,
      betCount: BET_COUNT,
      signal: controller.signal,
      onProgress: (done, total) => {
        setRunState(prev => ({ ...prev, done, total }));
      },
    })
      .then(result => {
        setRunState(prev => ({ ...prev, running: false, result }));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setRunState(INITIAL_RUN_STATE);
          return;
        }
        setRunState(prev => ({ ...prev, running: false, error: String(err) }));
      });
  }, [rounds, betAmount]);

  const handleCancel = React.useCallback((): void => {
    abortControllerRef.current?.abort();
  }, []);

  const cacheStatusText = React.useMemo(() => {
    if (status === 'loading') {
      return 'Downloading previous.jsonl (~13MB)...';
    }
    if (status === 'error') {
      return error ?? 'Failed to load round history.';
    }
    if (status === 'ready') {
      const fetchedText = fetchedAt ? formatDate(fetchedAt, { fromNow: true }) : 'unknown';
      return `${rounds.length} rounds loaded (newest #${newestRound}), fetched ${fetchedText}.`;
    }
    return '';
  }, [status, error, fetchedAt, rounds.length, newestRound]);

  const progressPercent =
    runState.total > 0 ? Math.round((runState.done / runState.total) * 100) : 0;

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
              <Dialog.Title>Compare Max-TER Models</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Backtests max-TER bets across every completed historical round, once with the
                  legacy model and once with the experimental logit model.
                </Text>

                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                  <Text fontSize="sm" color="fg.muted">
                    {cacheStatusText}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => refetch()}
                    disabled={status === 'loading' || runState.running}
                  >
                    Refresh
                  </Button>
                </HStack>

                <HStack>
                  <Text fontSize="sm" fontWeight="medium" width="90px">
                    Bet Amount:
                  </Text>
                  <Input
                    type="number"
                    value={betAmountInput}
                    onChange={e => setBetAmountInput(e.target.value)}
                    width="140px"
                    size="sm"
                    disabled={runState.running}
                  />
                </HStack>

                <HStack gap={3}>
                  <Button
                    onClick={handleRunBacktest}
                    disabled={status !== 'ready' || runState.running || rounds.length === 0}
                  >
                    <FaBalanceScale />
                    Run Backtest
                  </Button>
                  {runState.running && (
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  )}
                </HStack>

                {runState.running && (
                  <Stack gap={1}>
                    <Progress.Root value={progressPercent} size="sm" colorPalette="nfc-blue">
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                    <Text fontSize="xs" color="fg.muted">
                      {runState.done} / {runState.total} rounds ({progressPercent}%)
                    </Text>
                  </Stack>
                )}

                {runState.error && (
                  <Text fontSize="sm" color="nfc-red.fg">
                    {runState.error}
                  </Text>
                )}

                {runState.result && (
                  <Stack gap={4}>
                    <Stack direction={{ base: 'column', md: 'row' }} gap={3}>
                      <ModelSummaryCard
                        title="Legacy model"
                        result={runState.result.legacy}
                        isWinner={
                          runState.result.legacy.netProfit >= runState.result.logit.netProfit
                        }
                      />
                      <ModelSummaryCard
                        title="Logit model"
                        result={runState.result.logit}
                        isWinner={
                          runState.result.logit.netProfit > runState.result.legacy.netProfit
                        }
                      />
                    </Stack>
                    <BacktestComparisonChart
                      rounds={runState.result.rounds}
                      legacyCumulative={runState.result.legacy.cumulativeNet}
                      logitCumulative={runState.result.logit.cumulativeNet}
                    />
                  </Stack>
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
