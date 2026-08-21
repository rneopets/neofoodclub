import {
  Button,
  CloseButton,
  Dialog,
  HStack,
  Input,
  Portal,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';

import { computeDrift, summarizeDrift, type DriftPoint } from '../../devTiming/drift';
import { useRoundTiming } from '../../devTiming/useRoundTiming';
import { RoundEndDriftChart } from '../charts/RoundEndDriftChart';

interface RoundEndDriftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type RangePreset = 'last30' | 'last100' | 'last500' | 'all';

const RANGE_PRESETS: { value: RangePreset; label: string; count: number | null }[] = [
  { value: 'last30', label: 'Last 30', count: 30 },
  { value: 'last100', label: 'Last 100', count: 100 },
  { value: 'last500', label: 'Last 500', count: 500 },
  { value: 'all', label: 'All', count: null },
];

function formatOffsetMinutes(value: number | null): string {
  if (value === null) {
    return '\u2014';
  }
  if (value === 0) {
    return 'on time';
  }
  const sign = value > 0 ? '+' : '\u2212';
  return `${sign}${Math.abs(value).toFixed(1)} min`;
}

export function RoundEndDriftModal({
  isOpen,
  onClose,
}: RoundEndDriftModalProps): React.JSX.Element {
  const timing = useRoundTiming({ enabled: isOpen });

  const [rangePreset, setRangePreset] = React.useState<RangePreset>('all');
  const [minRoundInput, setMinRoundInput] = React.useState('');
  const [maxRoundInput, setMaxRoundInput] = React.useState('');

  const allPoints = React.useMemo<DriftPoint[]>(() => {
    if (timing.status !== 'ready') {
      return [];
    }
    return computeDrift(timing.timings);
  }, [timing.status, timing.timings]);

  const visiblePoints = React.useMemo<DriftPoint[]>(() => {
    if (allPoints.length === 0) {
      return [];
    }

    const min = parseInt(minRoundInput, 10);
    const max = parseInt(maxRoundInput, 10);
    const hasCustomRange = !Number.isNaN(min) || !Number.isNaN(max);

    if (hasCustomRange) {
      return allPoints.filter(point => {
        const aboveMin = Number.isNaN(min) || point.round >= min;
        const belowMax = Number.isNaN(max) || point.round <= max;
        return aboveMin && belowMax;
      });
    }

    const preset = RANGE_PRESETS.find(p => p.value === rangePreset);
    if (preset && preset.count !== null) {
      return allPoints.slice(-preset.count);
    }
    return allPoints;
  }, [allPoints, rangePreset, minRoundInput, maxRoundInput]);

  const summary = React.useMemo(() => summarizeDrift(visiblePoints), [visiblePoints]);

  const statusText = React.useMemo(() => {
    if (timing.status === 'loading') {
      return 'Downloading previous.jsonl (~13MB)...';
    }
    if (timing.status === 'error') {
      return timing.error ?? 'Failed to load round history.';
    }
    if (timing.status === 'ready') {
      return `${allPoints.length} rounds with end times loaded.`;
    }
    return '';
  }, [timing.status, timing.error, allPoints.length]);

  const handlePresetClick = React.useCallback((preset: RangePreset): void => {
    setRangePreset(preset);
    // A preset supersedes any custom bounds.
    setMinRoundInput('');
    setMaxRoundInput('');
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
              <Dialog.Title>Round End-Time Drift</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Plots how far each round&apos;s actual end time (when winners post) drifted from
                  the expected 2:15 PM Pacific. The shaded band at the bottom is the 0&ndash;2
                  minute window - ends in that range are just scraper lag, not drift.
                </Text>

                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                  <Text fontSize="sm" color="fg.muted">
                    {statusText}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => timing.refetch()}
                    disabled={timing.status === 'loading'}
                  >
                    Refresh
                  </Button>
                </HStack>

                <Stack gap={2}>
                  <Text fontSize="sm" fontWeight="medium">
                    Range:
                  </Text>
                  <HStack gap={2} flexWrap="wrap">
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
                  <HStack gap={2}>
                    <Input
                      type="number"
                      placeholder="Min round"
                      value={minRoundInput}
                      onChange={e => setMinRoundInput(e.target.value)}
                      width="120px"
                      size="sm"
                    />
                    <Text fontSize="sm" color="fg.muted">
                      to
                    </Text>
                    <Input
                      type="number"
                      placeholder="Max round"
                      value={maxRoundInput}
                      onChange={e => setMaxRoundInput(e.target.value)}
                      width="120px"
                      size="sm"
                    />
                  </HStack>
                </Stack>

                {timing.status === 'ready' && visiblePoints.length > 0 && (
                  <>
                    <SimpleGrid columns={{ base: 2, md: 4 }} gap={3}>
                      <SummaryStat label="Rounds in range" value={String(visiblePoints.length)} />
                      <SummaryStat
                        label="Drifted late (>2 min)"
                        value={String(summary.countLateDrift)}
                      />
                      <SummaryStat label="Ended early" value={String(summary.countEarly)} />
                      <SummaryStat
                        label="Most delayed"
                        value={
                          summary.mostDelayedRound !== null && summary.maxOffsetMinutes !== null
                            ? `#${summary.mostDelayedRound} (${formatOffsetMinutes(summary.maxOffsetMinutes)})`
                            : '\u2014'
                        }
                      />
                    </SimpleGrid>

                    <RoundEndDriftChart points={visiblePoints} />
                  </>
                )}

                {timing.status === 'ready' && visiblePoints.length === 0 && (
                  <Text fontSize="sm" color="fg.muted">
                    No rounds in the selected range.
                  </Text>
                )}
              </Stack>
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <Stack gap={1}>
      <Text fontSize="xs" color="fg.muted">
        {label}
      </Text>
      <Text fontSize="md" fontWeight="medium">
        {value}
      </Text>
    </Stack>
  );
}
