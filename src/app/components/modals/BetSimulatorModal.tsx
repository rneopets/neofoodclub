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
  Link,
  Portal,
  Progress,
  Select,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';
import { FaTrophy } from 'react-icons/fa';

import {
  AMOUNT_PRESETS,
  formatBacktestAmount,
  isModelDependentStrategy,
  runFullBacktest,
} from '../../backtest/runBacktest';
import { STRATEGY_LABELS, STRATEGY_ORDER } from '../../backtest/strategyLabels';
import type {
  BacktestRoundEntry,
  BacktestStrategy,
  BacktestSummary,
  ModelBacktestResult,
} from '../../backtest/types';
import { useBacktestPreviousRounds } from '../../hooks/useBacktestPreviousRounds';
import { BacktestComparisonChart } from '../charts/BacktestComparisonChart';

const BET_COUNT = 10;
const DEFAULT_BET_AMOUNT = 10000;
const TOP_N = 5;

function roundLink(roundNumber: number): string {
  return `https://neofood.club/#round=${roundNumber}`;
}

function displayPercent(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

interface BetSimulatorState {
  running: boolean;
  done: number;
  total: number;
  result: BacktestSummary | null;
  betAmount: number | null;
  strategy: BacktestStrategy | null;
  error: string | null;
}

const INITIAL_STATE: BetSimulatorState = {
  running: false,
  done: 0,
  total: 0,
  result: null,
  betAmount: null,
  strategy: null,
  error: null,
};

function ModelCard({
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
            <Text fontSize="sm">{formatBacktestAmount(result.totalSpent)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Total Won
            </Text>
            <Text fontSize="sm">{formatBacktestAmount(result.totalWon)}</Text>
          </HStack>
          <HStack justify="space-between">
            <Text fontSize="sm" color="fg.muted">
              Net Profit
            </Text>
            <Text fontSize="sm">{formatBacktestAmount(result.netProfit)}</Text>
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

function TopWinsTable({ entries }: { entries: BacktestRoundEntry[] }): React.JSX.Element {
  return (
    <Stack gap={1}>
      <Text fontSize="sm" fontWeight="medium">
        Biggest wins
      </Text>
      <Table.Root size="sm" width="full">
        <Table.Header>
          <Table.Row>
            <Table.ColumnHeader width="40px">#</Table.ColumnHeader>
            <Table.ColumnHeader width="120px">Round</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Won</Table.ColumnHeader>
            <Table.ColumnHeader textAlign="right">Net</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {entries.map((entry, index) => (
            <Table.Row key={entry.round}>
              <Table.Cell>{index + 1}</Table.Cell>
              <Table.Cell>
                <Link href={roundLink(entry.round)} target="_blank" fontSize="sm">
                  #{entry.round}
                </Link>
              </Table.Cell>
              <Table.Cell textAlign="right">{formatBacktestAmount(entry.won)}</Table.Cell>
              <Table.Cell textAlign="right" color="nfc-green.fg">
                {formatBacktestAmount(entry.net)}
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    </Stack>
  );
}

function ModelPayouts({
  title,
  result,
}: {
  title: string;
  result: ModelBacktestResult;
}): React.JSX.Element | null {
  if (!result.topWins || result.topWins.length === 0) {
    return null;
  }

  return (
    <Stack gap={2} flex="1" minW="280px">
      <Text fontSize="sm" fontWeight="medium">
        {title} - biggest single-round wins
      </Text>
      <TopWinsTable entries={result.topWins} />
    </Stack>
  );
}

export const BetSimulatorModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { status, rounds, newestRound, error, refetch } = useBacktestPreviousRounds({
    enabled: isOpen,
  });

  const [betAmountInput, setBetAmountInput] = React.useState(String(DEFAULT_BET_AMOUNT));
  const [strategy, setStrategy] = React.useState<BacktestStrategy>('bestGambit');
  const [state, setState] = React.useState<BetSimulatorState>(INITIAL_STATE);
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
    setState(INITIAL_STATE);
  }, []);

  const handleStrategyChange = React.useCallback((next: BacktestStrategy): void => {
    abortControllerRef.current?.abort();
    setStrategy(next);
    setState(INITIAL_STATE);
  }, []);

  const handleRun = React.useCallback((): void => {
    if (rounds.length === 0) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setState({
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
      topN: TOP_N,
      signal: controller.signal,
      onProgress: (done, total) => {
        setState(prev => ({ ...prev, done, total }));
      },
    })
      .then(result => {
        setState(prev => ({ ...prev, running: false, result }));
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setState(INITIAL_STATE);
          return;
        }
        setState(prev => ({ ...prev, running: false, error: String(err) }));
      });
  }, [rounds, betAmount, strategy]);

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
      return `${rounds.length} rounds loaded (newest #${newestRound}).`;
    }
    return '';
  }, [status, error, rounds.length, newestRound]);

  const progressPercent = state.total > 0 ? Math.round((state.done / state.total) * 100) : 0;

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
                <FaTrophy />
                <Text fontWeight="semibold">Bet Simulator</Text>
              </HStack>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Backtests a chosen bet strategy across every completed historical round, once with
                  the legacy model and once with the logit model, and surfaces the biggest
                  single-round wins.
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
                    disabled={state.running}
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
                    disabled={status === 'loading' || state.running}
                  >
                    Refresh
                  </Button>
                </HStack>

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
                      disabled={state.running}
                    />
                  </HStack>
                  <HStack gap={2} flexWrap="wrap">
                    {AMOUNT_PRESETS.map(preset => (
                      <Button
                        key={preset}
                        size="xs"
                        variant="outline"
                        onClick={() => handleBetAmountInputChange(String(preset))}
                        disabled={state.running}
                      >
                        {formatBacktestAmount(preset)}
                      </Button>
                    ))}
                  </HStack>
                </Stack>

                <HStack gap={3}>
                  <Button
                    onClick={handleRun}
                    disabled={status !== 'ready' || state.running || rounds.length === 0}
                  >
                    <FaTrophy />
                    Run Bet Simulator
                  </Button>
                  {state.running && (
                    <Button variant="outline" onClick={handleCancel}>
                      Cancel
                    </Button>
                  )}
                </HStack>

                {state.running && (
                  <Stack gap={1}>
                    <Progress.Root value={progressPercent} size="sm" colorPalette="nfc-blue">
                      <Progress.Track>
                        <Progress.Range />
                      </Progress.Track>
                    </Progress.Root>
                    <Text fontSize="xs" color="fg.muted">
                      {state.done} / {state.total} rounds ({progressPercent}%)
                    </Text>
                  </Stack>
                )}

                {state.error && (
                  <Text fontSize="sm" color="nfc-red.fg">
                    {state.error}
                  </Text>
                )}

                {state.result && state.strategy !== null && (
                  <Stack gap={4}>
                    <Text fontSize="sm" color="fg.muted">
                      {STRATEGY_LABELS[state.strategy].name} results at bet amount:{' '}
                      <Code fontSize="sm">
                        {formatBacktestAmount(state.betAmount ?? betAmount)}
                      </Code>
                    </Text>

                    {isModelDependentStrategy(state.strategy) ? (
                      <HStack gap={3} flexWrap="wrap">
                        <ModelCard
                          title="Legacy model"
                          result={state.result.legacy}
                          isWinner={state.result.legacy.netProfit >= state.result.logit.netProfit}
                        />
                        <ModelCard
                          title="Logit model"
                          result={state.result.logit}
                          isWinner={state.result.logit.netProfit > state.result.legacy.netProfit}
                        />
                      </HStack>
                    ) : (
                      <>
                        <ModelCard title="Result" result={state.result.legacy} isWinner={false} />
                        <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                          {STRATEGY_LABELS[state.strategy].name}&apos;s bet selection doesn&apos;t
                          consult the probability model, so the legacy/logit choice doesn&apos;t
                          apply here.
                        </Text>
                      </>
                    )}

                    <BacktestComparisonChart
                      rounds={state.result.rounds}
                      legacyCumulative={state.result.legacy.cumulativeNet}
                      logitCumulative={state.result.logit.cumulativeNet}
                      showBothModels={isModelDependentStrategy(state.strategy)}
                    />

                    {isModelDependentStrategy(state.strategy) ? (
                      <HStack gap={3} align="start" flexWrap="wrap">
                        <ModelPayouts title="Legacy model" result={state.result.legacy} />
                        <ModelPayouts title="Logit model" result={state.result.logit} />
                      </HStack>
                    ) : (
                      <ModelPayouts title="Result" result={state.result.legacy} />
                    )}
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
