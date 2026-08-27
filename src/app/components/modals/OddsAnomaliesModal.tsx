import {
  Button,
  CloseButton,
  Dialog,
  HStack,
  Link,
  Portal,
  Progress,
  Stack,
  Table,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';

import {
  findMostChangesRound,
  findThirteenRounds,
  positiveArenaDistribution,
  type AnomalyRound,
} from '../../analysis/oddsAnomalies';
import {
  useOddsAnomalyRounds,
  type UseOddsAnomalyRoundsResult,
} from '../../hooks/useOddsAnomalyRounds';

interface OddsAnomaliesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function roundLink(roundNumber: number): string {
  return `https://neofood.club/#round=${roundNumber}`;
}

function ThirteensSection({ rounds }: { rounds: AnomalyRound[] }): React.JSX.Element | null {
  const thirteenRounds = React.useMemo(() => findThirteenRounds(rounds), [rounds]);

  if (thirteenRounds.length === 0) {
    return null;
  }

  return (
    <Stack gap={2}>
      <HStack>
        <Text fontSize="sm" fontWeight="medium">
          Thirteens:
        </Text>
        <Text fontSize="sm" color="fg.muted">
          {thirteenRounds.length} round{thirteenRounds.length === 1 ? '' : 's'} where all five
          arenas had a 13:1 opening or closing price
        </Text>
      </HStack>
      <HStack gap={2} flexWrap="wrap" align="start" maxH="180px" overflowY="auto">
        {thirteenRounds.map(roundNumber => (
          <Link key={roundNumber} href={roundLink(roundNumber)} target="_blank" fontSize="sm">
            #{roundNumber}
          </Link>
        ))}
      </HStack>
    </Stack>
  );
}

function MostChangesSection({ rounds }: { rounds: AnomalyRound[] }): React.JSX.Element | null {
  const mostChanges = React.useMemo(() => findMostChangesRound(rounds), [rounds]);

  if (mostChanges === null) {
    return null;
  }

  return (
    <HStack>
      <Text fontSize="sm" fontWeight="medium">
        Most changes:
      </Text>
      <Text fontSize="sm" color="fg.muted">
        round{' '}
        <Link href={roundLink(mostChanges.round)} target="_blank" fontSize="sm">
          #{mostChanges.round}
        </Link>{' '}
        with {mostChanges.changeCount} odds change{mostChanges.changeCount === 1 ? '' : 's'}
      </Text>
    </HStack>
  );
}

function PositiveArenasSection({ rounds }: { rounds: AnomalyRound[] }): React.JSX.Element | null {
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
                {((row.count / distribution.totalRounds) * 100).toFixed(1)}%
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

export const OddsAnomaliesModal: React.FC<OddsAnomaliesModalProps> = ({ isOpen, onClose }) => {
  const feed: UseOddsAnomalyRoundsResult = useOddsAnomalyRounds({ enabled: isOpen });

  const statusText = React.useMemo(() => {
    if (feed.status === 'loading') {
      return 'Downloading previous.jsonl (~13MB)...';
    }
    if (feed.status === 'error') {
      return feed.error ?? 'Failed to load round history.';
    }
    if (feed.status === 'ready') {
      return `${feed.rounds.length} rounds loaded.`;
    }
    return '';
  }, [feed]);

  const hasResults = feed.status === 'ready' && feed.rounds.length > 0;

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
              <Dialog.Title>Odds Anomalies</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body display="flex" flexDirection="column" overflowY="auto">
              <Stack gap={4}>
                <Text fontSize="sm" color="fg.muted">
                  Scans every completed round on the CDN feed for unusual odds behavior: rounds
                  where the book capped all five arenas at 13:1, the round with the most odds
                  changes, and how often arenas are positive.
                </Text>

                <HStack justify="space-between" flexWrap="wrap" gap={2}>
                  <Text fontSize="sm" color="fg.muted">
                    {statusText}
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => feed.refetch()}
                    disabled={feed.status === 'loading'}
                  >
                    Refresh
                  </Button>
                </HStack>

                {hasResults && (
                  <>
                    <ThirteensSection rounds={feed.rounds} />
                    <MostChangesSection rounds={feed.rounds} />
                    <PositiveArenasSection rounds={feed.rounds} />
                  </>
                )}

                {feed.status === 'ready' && feed.rounds.length === 0 && (
                  <Text fontSize="sm" color="fg.muted">
                    No rounds loaded.
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
