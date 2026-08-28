import {
  Badge,
  Button,
  Card,
  CloseButton,
  Code,
  createListCollection,
  Dialog,
  HStack,
  Input,
  Portal,
  Progress,
  SegmentGroup,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';
import { FaBalanceScale } from 'react-icons/fa';

import {
  AMOUNT_PRESETS,
  formatBacktestAmount,
  isModelDependentStrategy,
  runBacktestAmountSweep,
  runFullBacktest,
} from '../../backtest/runBacktest';
import { STRATEGY_LABELS, STRATEGY_ORDER } from '../../backtest/strategyLabels';
import type {
  AmountSweepPoint,
  BacktestStrategy,
  BacktestSummary,
  ModelBacktestResult,
} from '../../backtest/types';
import { useBacktestPreviousRounds } from '../../hooks/useBacktestPreviousRounds';
import { BacktestAmountSweepChart } from '../charts/BacktestAmountSweepChart';
import { BacktestComparisonChart } from '../charts/BacktestComparisonChart';

const BET_COUNT = 10;
const DEFAULT_BET_AMOUNT = 10000;
const STEP_OPTIONS = [1000, 2000, 3000, 4000, 5000];
const DEFAULT_STEP = 5000;
const MAX_SWEEP_AMOUNT_CEILING = 500000;
const MAX_SWEEP_AMOUNT_INCREMENT = 50000;
const DEFAULT_MAX_SWEEP_AMOUNT = 100000;
const MAX_SWEEP_AMOUNT_OPTIONS = Array.from(
  { length: MAX_SWEEP_AMOUNT_CEILING / MAX_SWEEP_AMOUNT_INCREMENT },
  (_, i) => (i + 1) * MAX_SWEEP_AMOUNT_INCREMENT,
);

// The real max bet on Neopets increases by 2 NP/day since Food Club's
// 1999-11-15 launch - referenced here so the sweep's higher amounts are
// clearly understood as hypothetical, not currently placeable.
const NEO_LAUNCH_DATE = Date.UTC(1999, 10, 15);

function computeRealMaxBet(): number {
  const daysSinceLaunch = Math.floor((Date.now() - NEO_LAUNCH_DATE) / (24 * 60 * 60 * 1000));
  return daysSinceLaunch * 2 + 50;
}

const SEGMENT_GROUP_CSS = {
  bg: 'bg.subtle',
  borderWidth: '1px',
  borderColor: 'border',
  '& [data-state=unchecked]': {
    color: 'fg.muted',
  },
  '& [data-state=checked]': {
    color: 'fg',
    fontWeight: 'semibold',
  },
  _dark: {
    borderColor: 'border.emphasized',
    '& [data-state=unchecked]': {
      color: 'fg.subtle',
    },
  },
  '& [data-part=indicator]': {
    borderWidth: '1px',
    borderColor: 'border',
    bg: { base: 'bg', _dark: 'bg.emphasized' },
    shadow: 'sm',
  },
} as const;

interface BacktestComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RunState {
  running: boolean;
  done: number;
  total: number;
  result: BacktestSummary | null;
  betAmount: number | null;
  strategy: BacktestStrategy | null;
  error: string | null;
}

const INITIAL_RUN_STATE: RunState = {
  running: false,
  done: 0,
  total: 0,
  result: null,
  betAmount: null,
  strategy: null,
  error: null,
};

interface SweepState {
  running: boolean;
  done: number;
  total: number;
  result: AmountSweepPoint[] | null;
  strategy: BacktestStrategy | null;
  error: string | null;
}

const INITIAL_SWEEP_STATE: SweepState = {
  running: false,
  done: 0,
  total: 0,
  result: null,
  strategy: null,
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
  const [showExact, setShowExact] = React.useState(false);
  const toggleExact = React.useCallback(() => setShowExact(prev => !prev), []);

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
            <Text
              fontSize="sm"
              cursor="pointer"
              onClick={toggleExact}
              title={showExact ? 'Click to abbreviate' : 'Click for exact value'}
            >
              {showExact
                ? result.totalSpent.toLocaleString()
                : formatBacktestAmount(result.totalSpent)}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Total Won
            </Text>
            <Text
              fontSize="sm"
              cursor="pointer"
              onClick={toggleExact}
              title={showExact ? 'Click to abbreviate' : 'Click for exact value'}
            >
              {showExact ? result.totalWon.toLocaleString() : formatBacktestAmount(result.totalWon)}
            </Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Net Profit
            </Text>
            <Text
              fontSize="sm"
              cursor="pointer"
              onClick={toggleExact}
              title={showExact ? 'Click to abbreviate' : 'Click for exact value'}
            >
              {showExact
                ? result.netProfit.toLocaleString()
                : formatBacktestAmount(result.netProfit)}
            </Text>
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
          {result.roundsSkipped > 0 && (
            <HStack justify="space-between">
              <Text fontSize="sm" color="fg.muted">
                Skipped Rounds
              </Text>
              <Text fontSize="sm">{result.roundsSkipped}</Text>
            </HStack>
          )}
        </Stack>
      </Card.Body>
    </Card.Root>
  );
}

export const BacktestComparisonModal: React.FC<BacktestComparisonModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { status, rounds, newestRound, error, refetch } = useBacktestPreviousRounds({
    enabled: isOpen,
  });

  const [betAmountInput, setBetAmountInput] = React.useState(String(DEFAULT_BET_AMOUNT));
  const [strategy, setStrategy] = React.useState<BacktestStrategy>('maxTer');
  const [runState, setRunState] = React.useState<RunState>(INITIAL_RUN_STATE);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const strategyCollection = React.useMemo(
    () =>
      createListCollection({
        items: STRATEGY_ORDER.map(key => ({ label: STRATEGY_LABELS[key].name, value: key })),
      }),
    [],
  );

  const betAmount = React.useMemo(() => {
    const value = Number(betAmountInput);
    return !isNaN(value) && value > 0 ? value : DEFAULT_BET_AMOUNT;
  }, [betAmountInput]);

  const handleBetAmountInputChange = React.useCallback((newValue: string): void => {
    abortControllerRef.current?.abort();
    setBetAmountInput(newValue);
    setRunState(INITIAL_RUN_STATE);
  }, []);

  const handleRunBacktest = React.useCallback((): void => {
    if (rounds.length === 0) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunState({
      running: true,
      done: 0,
      total: rounds.length,
      result: null,
      betAmount,
      strategy,
      error: null,
    });

    void runFullBacktest(rounds, {
      betAmount,
      betCount: BET_COUNT,
      strategy,
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
  }, [rounds, betAmount, strategy]);

  const handleCancel = React.useCallback((): void => {
    abortControllerRef.current?.abort();
  }, []);

  const [sweepStep, setSweepStep] = React.useState(DEFAULT_STEP);
  const [sweepMaxAmount, setSweepMaxAmount] = React.useState(DEFAULT_MAX_SWEEP_AMOUNT);
  const [sweepState, setSweepState] = React.useState<SweepState>(INITIAL_SWEEP_STATE);
  const sweepAbortControllerRef = React.useRef<AbortController | null>(null);

  const sweepAmounts = React.useMemo(() => {
    const amounts: number[] = [];
    for (let amount = sweepStep; amount <= sweepMaxAmount; amount += sweepStep) {
      amounts.push(amount);
    }
    return amounts;
  }, [sweepStep, sweepMaxAmount]);

  const handleRunSweep = React.useCallback((): void => {
    if (rounds.length === 0) {
      return;
    }

    const controller = new AbortController();
    sweepAbortControllerRef.current = controller;

    const totalRounds = sweepAmounts.length * rounds.length;
    setSweepState({
      running: true,
      done: 0,
      total: totalRounds,
      result: null,
      strategy,
      error: null,
    });

    void runBacktestAmountSweep(rounds, {
      amounts: sweepAmounts,
      betCount: BET_COUNT,
      strategy,
      signal: controller.signal,
      onProgress: (done, total) => {
        setSweepState(prev => ({ ...prev, done, total }));
      },
      onStepComplete: point => {
        setSweepState(prev => ({
          ...prev,
          result: prev.result ? [...prev.result, point] : [point],
        }));
      },
    })
      .then(result => {
        setSweepState(prev => ({ ...prev, running: false, result }));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setSweepState(INITIAL_SWEEP_STATE);
          return;
        }
        setSweepState(prev => ({ ...prev, running: false, error: String(err) }));
      });
  }, [rounds, sweepAmounts, strategy]);

  const handleCancelSweep = React.useCallback((): void => {
    sweepAbortControllerRef.current?.abort();
  }, []);

  // Changing the strategy invalidates any previous results (they were run with
  // a different bet generator), so both tabs reset. Declared after the sweep's
  // abort ref so it can cancel an in-flight sweep too.
  const handleStrategyChange = React.useCallback((next: BacktestStrategy): void => {
    abortControllerRef.current?.abort();
    sweepAbortControllerRef.current?.abort();
    setStrategy(next);
    setRunState(INITIAL_RUN_STATE);
    setSweepState(INITIAL_SWEEP_STATE);
  }, []);

  const cacheStatusText = React.useMemo(() => {
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
              <Dialog.Title>Compare Bet Strategies</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Backtests a chosen bet strategy across every completed historical round, once with
                  the legacy model and once with the experimental logit model.
                </Text>

                <Stack gap={1}>
                  <Text fontSize="sm" fontWeight="medium">
                    Bet Strategy:
                  </Text>
                  <Select.Root
                    collection={strategyCollection}
                    size="sm"
                    value={[strategy]}
                    minW="260px"
                    disabled={runState.running || sweepState.running}
                    onValueChange={(details: { value: string[] }) => {
                      const next = details.value[0] as BacktestStrategy | undefined;
                      if (next !== undefined) {
                        handleStrategyChange(next);
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
                        {strategyCollection.items.map(item => (
                          <Select.Item item={item} key={item.value}>
                            <Select.ItemText>{item.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Content>
                    </Select.Positioner>
                  </Select.Root>
                  <Text fontSize="xs" color="fg.muted">
                    {STRATEGY_LABELS[strategy].blurb}
                  </Text>
                </Stack>

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

                <Tabs.Root defaultValue="single" variant="line">
                  <Tabs.List>
                    <Tabs.Trigger value="single">Single Amount</Tabs.Trigger>
                    <Tabs.Trigger value="sweep">Sweep Amounts</Tabs.Trigger>
                  </Tabs.List>

                  <Tabs.Content value="single">
                    <Stack gap={4}>
                      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                        {isModelDependentStrategy(strategy) ? (
                          <>
                            Both models use the same {STRATEGY_LABELS[strategy].name} selection -
                            only the underlying probabilities differ. The bet amount below is what
                            each bet wagers; Max-TER and General ER also use it to rank which bets
                            they pick.
                          </>
                        ) : (
                          <>
                            {STRATEGY_LABELS[strategy].name}&apos;s bet selection doesn&apos;t
                            consult the probability model, so legacy and logit produce identical
                            results here - shown for layout consistency with the other strategies.
                          </>
                        )}
                      </Text>
                      <Stack gap={2}>
                        <HStack>
                          <Text fontSize="sm" fontWeight="medium" width="90px">
                            Bet Amount:
                          </Text>
                          <Input
                            type="number"
                            value={betAmountInput}
                            onChange={e => handleBetAmountInputChange(e.target.value)}
                            width="140px"
                            size="sm"
                            disabled={runState.running}
                          />
                        </HStack>
                        <HStack gap={2} flexWrap="wrap">
                          {AMOUNT_PRESETS.map(preset => (
                            <Button
                              key={preset}
                              size="xs"
                              variant="outline"
                              onClick={() => handleBetAmountInputChange(String(preset))}
                              disabled={runState.running}
                            >
                              {formatBacktestAmount(preset)}
                            </Button>
                          ))}
                        </HStack>
                        <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                          Yes, we know the max bet amount on Neopets is{' '}
                          <Code fontSize="xs">{computeRealMaxBet().toLocaleString()}</Code> -
                          amounts above that are hypothetical/exploratory only.
                        </Text>
                      </Stack>

                      <HStack gap={3}>
                        <Button
                          onClick={handleRunBacktest}
                          disabled={
                            status !== 'ready' ||
                            runState.running ||
                            rounds.length === 0 ||
                            runState.result !== null
                          }
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

                      {runState.result && runState.strategy !== null && (
                        <Stack gap={4}>
                          <Text fontSize="sm" color="fg.muted">
                            Results for {STRATEGY_LABELS[runState.strategy].name} at bet amount:{' '}
                            <Code fontSize="sm">
                              {formatBacktestAmount(runState.betAmount ?? betAmount)}
                            </Code>
                          </Text>
                          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
                            <ModelSummaryCard
                              title="Legacy model"
                              result={runState.result.legacy}
                              isWinner={
                                isModelDependentStrategy(runState.strategy) &&
                                runState.result.legacy.netProfit >= runState.result.logit.netProfit
                              }
                            />
                            <ModelSummaryCard
                              title="Logit model"
                              result={runState.result.logit}
                              isWinner={
                                isModelDependentStrategy(runState.strategy) &&
                                runState.result.logit.netProfit > runState.result.legacy.netProfit
                              }
                            />
                          </SimpleGrid>
                          <BacktestComparisonChart
                            rounds={runState.result.rounds}
                            legacyCumulative={runState.result.legacy.cumulativeNet}
                            logitCumulative={runState.result.logit.cumulativeNet}
                          />
                        </Stack>
                      )}
                    </Stack>
                  </Tabs.Content>

                  <Tabs.Content value="sweep">
                    <Stack gap={3}>
                      <Text fontSize="xs" color="fg.muted">
                        Runs the full {STRATEGY_LABELS[strategy].name} backtest once per bet-amount
                        step from the chosen increment up to {formatBacktestAmount(sweepMaxAmount)},
                        and plots ROI vs. bet amount.
                      </Text>
                      <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                        This can take a while - more steps means more full backtests to run, so
                        lower increments (more steps) take even longer.
                      </Text>

                      <Stack gap={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          Max amount:
                        </Text>
                        <SegmentGroup.Root
                          value={String(sweepMaxAmount)}
                          size="sm"
                          onValueChange={(details: { value: string | null }) => {
                            if (details.value === null) {
                              return;
                            }
                            setSweepMaxAmount(Number(details.value));
                          }}
                          css={SEGMENT_GROUP_CSS}
                        >
                          <SegmentGroup.Indicator />
                          {MAX_SWEEP_AMOUNT_OPTIONS.map(amount => (
                            <SegmentGroup.Item
                              key={amount}
                              value={String(amount)}
                              disabled={sweepState.running}
                            >
                              <SegmentGroup.ItemText>
                                {formatBacktestAmount(amount)}
                              </SegmentGroup.ItemText>
                              <SegmentGroup.ItemHiddenInput />
                            </SegmentGroup.Item>
                          ))}
                        </SegmentGroup.Root>
                      </Stack>

                      <Stack gap={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          Step size:
                        </Text>
                        <SegmentGroup.Root
                          value={String(sweepStep)}
                          size="sm"
                          onValueChange={(details: { value: string | null }) => {
                            if (details.value === null) {
                              return;
                            }
                            setSweepStep(Number(details.value));
                          }}
                          css={SEGMENT_GROUP_CSS}
                        >
                          <SegmentGroup.Indicator />
                          {STEP_OPTIONS.map(step => (
                            <SegmentGroup.Item
                              key={step}
                              value={String(step)}
                              disabled={sweepState.running}
                            >
                              <SegmentGroup.ItemText>
                                {formatBacktestAmount(step)}
                              </SegmentGroup.ItemText>
                              <SegmentGroup.ItemHiddenInput />
                            </SegmentGroup.Item>
                          ))}
                        </SegmentGroup.Root>
                      </Stack>

                      <HStack gap={3}>
                        <Button
                          onClick={handleRunSweep}
                          disabled={status !== 'ready' || sweepState.running || rounds.length === 0}
                        >
                          <FaBalanceScale />
                          Run All Amounts
                        </Button>
                        {sweepState.running && (
                          <Button variant="outline" onClick={handleCancelSweep}>
                            Cancel
                          </Button>
                        )}
                      </HStack>

                      {sweepState.running && (
                        <Stack gap={1}>
                          <Progress.Root
                            value={
                              sweepState.total > 0
                                ? Math.round((sweepState.done / sweepState.total) * 100)
                                : 0
                            }
                            size="sm"
                            colorPalette="nfc-blue"
                          >
                            <Progress.Track>
                              <Progress.Range />
                            </Progress.Track>
                          </Progress.Root>
                          <Text fontSize="xs" color="fg.muted">
                            {sweepState.done} / {sweepState.total} steps
                          </Text>
                        </Stack>
                      )}

                      {sweepState.error && (
                        <Text fontSize="sm" color="nfc-red.fg">
                          {sweepState.error}
                        </Text>
                      )}

                      {sweepState.result && <BacktestAmountSweepChart points={sweepState.result} />}
                    </Stack>
                  </Tabs.Content>
                </Tabs.Root>
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
