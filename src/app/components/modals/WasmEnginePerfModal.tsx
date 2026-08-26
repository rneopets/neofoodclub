import {
  Button,
  Checkbox,
  Dialog,
  CloseButton,
  HStack,
  Input,
  Portal,
  Progress,
  SegmentGroup,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';
import { FaGauge } from 'react-icons/fa6';

import { defaultRoundData } from '../../constants';
import {
  PERF_BET_COUNT,
  runEnginePerfSuite,
  type EnginePerfResult,
} from '../../perf/wasmEnginePerf';
import { useCurrentRound, useRoundStore } from '../../stores';
import { applyCustomOdds, applyCustomProbabilities, rebuildEngine } from '../../wasmEngine';
import RoundInput from '../inputs/RoundInput';

import type { RoundData } from '@/types';

interface WasmEnginePerfModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ITERATION_OPTIONS = [10, 50, 100, 500] as const;
const DEFAULT_ITERATIONS = 10;
const DEFAULT_BET_AMOUNT = 10000;

interface RunState {
  running: boolean;
  done: number;
  total: number;
  results: EnginePerfResult[] | null;
  error: string | null;
}

const INITIAL_RUN_STATE: RunState = {
  running: false,
  done: 0,
  total: 0,
  results: null,
  error: null,
};

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (typeof err === 'object' && err !== null && (err as { name?: string }).name === 'AbortError')
  );
}

function formatMs(value: number): string {
  if (value >= 10) {
    return value.toFixed(2);
  }
  if (value >= 1) {
    return value.toFixed(3);
  }
  return value.toFixed(4);
}

export const WasmEnginePerfModal: React.FC<WasmEnginePerfModalProps> = ({ isOpen, onClose }) => {
  const roundData = useRoundStore(state => state.roundData);
  const currentSelectedRound = useRoundStore(state => state.currentSelectedRound);
  const currentRoundFromCdn = useCurrentRound();

  // The round being timed - independent of the globally selected round, so
  // jumping ahead here never touches the rest of the page (same pattern as
  // RoundJsonModal).
  const [previewRound, setPreviewRound] = React.useState(0);
  const [previewData, setPreviewData] = React.useState<RoundData | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  // Reset the preview to the live round each time the modal opens. Runs as a
  // layout effect so the reset is committed before the fetch effect below sees
  // `previewRound` in this same pass.
  React.useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    setPreviewRound(currentSelectedRound);
    setPreviewData(null);
    setPreviewError(null);
  }, [isOpen, currentSelectedRound]);

  // Fetch the previewed round's JSON directly whenever it differs from the
  // round already loaded globally.
  React.useEffect(() => {
    if (!isOpen || previewRound === 0 || previewRound === roundData.round) {
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    const controller = new AbortController();
    setPreviewLoading(true);
    setPreviewError(null);

    fetch(`https://cdn.neofood.club/rounds/${previewRound}.json`, { signal: controller.signal })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<RoundData>;
      })
      .then(data => {
        setPreviewData(data);
        setPreviewLoading(false);
      })
      .catch(error => {
        if (controller.signal.aborted) {
          return;
        }
        console.error(`Failed to fetch round ${previewRound}:`, error);
        setPreviewError(`Failed to fetch round ${previewRound}`);
        setPreviewLoading(false);
      });

    return (): void => controller.abort();
  }, [isOpen, previewRound, roundData.round]);

  const displayedRoundData: RoundData | null =
    previewRound === roundData.round ? roundData : (previewData ?? defaultRoundData);

  const [iterations, setIterations] = React.useState<number>(DEFAULT_ITERATIONS);
  const [betAmountInput, setBetAmountInput] = React.useState(String(DEFAULT_BET_AMOUNT));
  const [useLogit, setUseLogit] = React.useState(false);
  const [runState, setRunState] = React.useState<RunState>(INITIAL_RUN_STATE);
  const abortControllerRef = React.useRef<AbortController | null>(null);

  const betAmount = React.useMemo(() => {
    const value = Number(betAmountInput);
    return !Number.isNaN(value) && value > 0 ? Math.round(value) : DEFAULT_BET_AMOUNT;
  }, [betAmountInput]);

  // The perf suite clobbers the app's shared wasm engine instance - rebuild it
  // for whatever round/mode the app is actually showing, reapply any custom
  // overrides, and recalculate so the table isn't left with stale numbers.
  const restoreAppEngine = React.useCallback((): void => {
    const state = useRoundStore.getState();
    if (state.roundData === defaultRoundData || !state.roundData.pirates?.length) {
      return; // the app has no round loaded - nothing to restore
    }
    try {
      rebuildEngine(
        JSON.stringify(state.roundData),
        state.maxBet >= 1 ? state.maxBet : null,
        state.useLogitModel,
      );
      if (state.customOddsMode) {
        if (state.customOdds) {
          applyCustomOdds(state.customOdds);
        }
        if (state.customProbs) {
          applyCustomProbabilities(state.customProbs);
        }
      } else {
        applyCustomOdds(null);
        applyCustomProbabilities(null);
      }
    } catch (error) {
      console.error('Failed to restore wasm engine after perf run:', error);
    } finally {
      state.recalculate();
    }
  }, []);

  // Cancels an in-flight run if the modal closes mid-run.
  React.useEffect(() => {
    if (!isOpen) {
      abortControllerRef.current?.abort();
    }
  }, [isOpen]);

  const handleRun = React.useCallback((): void => {
    if (!displayedRoundData?.pirates?.length) {
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setRunState({ running: true, done: 0, total: 0, results: null, error: null });

    void runEnginePerfSuite({
      roundJson: JSON.stringify(displayedRoundData),
      useLogit,
      betAmount,
      iterations,
      signal: controller.signal,
      onProgress: (done, total) => {
        setRunState(prev => ({ ...prev, done, total }));
      },
    })
      .then(results => {
        setRunState(prev => ({ ...prev, running: false, results }));
      })
      .catch((err: unknown) => {
        if (isAbortError(err)) {
          setRunState(INITIAL_RUN_STATE);
          return;
        }
        setRunState(prev => ({ ...prev, running: false, error: String(err) }));
      })
      .finally(restoreAppEngine);
  }, [displayedRoundData, useLogit, betAmount, iterations, restoreAppEngine]);

  const handleCancel = React.useCallback((): void => {
    abortControllerRef.current?.abort();
  }, []);

  const progressPercent =
    runState.total > 0 ? Math.round((runState.done / runState.total) * 100) : 0;

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
              <Dialog.Title>Wasm Engine Perf</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Times each of the wasm engine&apos;s bet generators, repeated per operation on the
                  round below. The app&apos;s own engine instance is temporarily rebuilt for this -
                  it gets restored (and recalculated) when the run finishes.
                </Text>

                <Stack gap={1} align="stretch">
                  <Text fontSize="sm" fontWeight="medium">
                    Change round
                  </Text>
                  <RoundInput
                    selectedRound={previewRound}
                    referenceRound={currentRoundFromCdn}
                    onRoundChange={setPreviewRound}
                    hasError={previewError !== null}
                  />
                </Stack>

                {previewError && (
                  <Text fontSize="sm" color="nfc-red.fg">
                    {previewError}
                  </Text>
                )}

                <Stack gap={2}>
                  <HStack>
                    <Text fontSize="sm" fontWeight="medium" width="90px">
                      Iterations:
                    </Text>
                    <SegmentGroup.Root
                      value={String(iterations)}
                      size="sm"
                      onValueChange={(details: { value: string | null }) => {
                        if (details.value === null) {
                          return;
                        }
                        setIterations(Number(details.value));
                      }}
                      disabled={runState.running}
                    >
                      <SegmentGroup.Indicator />
                      {ITERATION_OPTIONS.map(option => (
                        <SegmentGroup.Item key={option} value={String(option)}>
                          <SegmentGroup.ItemText>{option}</SegmentGroup.ItemText>
                          <SegmentGroup.ItemHiddenInput />
                        </SegmentGroup.Item>
                      ))}
                    </SegmentGroup.Root>
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
                  <HStack>
                    <Text fontSize="sm" fontWeight="medium" width="90px">
                      Model:
                    </Text>
                    <Checkbox.Root
                      checked={useLogit}
                      onCheckedChange={() => setUseLogit(prev => !prev)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>Experimental Logit</Checkbox.Label>
                    </Checkbox.Root>
                  </HStack>
                </Stack>

                <Text fontSize="xs" color="fg.muted" fontStyle="italic">
                  Every operation generates {PERF_BET_COUNT} bets. Gambit uses pirate 1 in all five
                  arenas; tenbet uses pirate 1 in the first three.
                </Text>

                <HStack gap={3}>
                  <Button
                    onClick={handleRun}
                    disabled={
                      runState.running || previewLoading || !displayedRoundData?.pirates?.length
                    }
                  >
                    <FaGauge />
                    Run Perf Suite
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
                      {runState.done} / {runState.total || '…'} operations ({progressPercent}%)
                    </Text>
                  </Stack>
                )}

                {runState.error && (
                  <Text fontSize="sm" color="nfc-red.fg">
                    {runState.error}
                  </Text>
                )}

                {runState.results && (
                  <Table.Root size="sm" width="full">
                    <Table.Header>
                      <Table.Row>
                        <Table.ColumnHeader>Operation</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Min (ms)</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Avg (ms)</Table.ColumnHeader>
                        <Table.ColumnHeader textAlign="right">Max (ms)</Table.ColumnHeader>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {runState.results.map(result => (
                        <Table.Row key={result.operation}>
                          <Table.Cell>{result.operation}</Table.Cell>
                          {result.timing ? (
                            <>
                              <Table.Cell textAlign="right">
                                {formatMs(result.timing.minMs)}
                              </Table.Cell>
                              <Table.Cell textAlign="right">
                                {formatMs(result.timing.avgMs)}
                              </Table.Cell>
                              <Table.Cell textAlign="right">
                                {formatMs(result.timing.maxMs)}
                              </Table.Cell>
                            </>
                          ) : (
                            <Table.Cell colSpan={3} color="fg.muted">
                              skipped: {result.skippedReason ?? 'not applicable'}
                            </Table.Cell>
                          )}
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Root>
                )}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
