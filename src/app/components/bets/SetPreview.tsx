import { Badge, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';

import { displayAsPercent } from '../../util';
import type { SetPreviewSummary } from '../../utils/setPreview';

const pct = (v: number): string => displayAsPercent(v, 1);

const SetPreview = ({ summary }: { summary: SetPreviewSummary | null }): React.ReactElement => {
  if (!summary) {
    return (
      <Text as="i" fontSize="sm" data-testid="set-preview-empty">
        Choose pirates to preview the set.
      </Text>
    );
  }

  const { likelyWinner, highestOutcome, er } = summary;

  return (
    <VStack gap={2} data-testid="set-preview">
      <HStack wrap="wrap" justify="center">
        <Badge variant="surface" data-testid="preview-bust">
          Bust: {pct(summary.bustRate)}
        </Badge>
        <Badge variant="surface" data-testid="preview-partial">
          Partial: {pct(summary.partialRate)}
        </Badge>
        <Badge
          variant="surface"
          {...(er !== null && er < 1 ? { colorPalette: 'nfc-red' } : {})}
          data-testid="preview-er"
        >
          ER: {er === null ? '-' : er.toFixed(3)}
        </Badge>
      </HStack>
      {likelyWinner && (
        <Text fontSize="sm" data-testid="preview-likely">
          Most likely winner: {likelyWinner.units.toFixed(0)} units ({pct(likelyWinner.probability)}
          ){likelyWinner.np !== null && ` / ${likelyWinner.np.toLocaleString()} NP`}
        </Text>
      )}
      {highestOutcome && (
        <Text fontSize="sm" data-testid="preview-highest">
          Highest outcome: {highestOutcome.units.toFixed(0)} units (
          {pct(highestOutcome.probability)})
          {highestOutcome.np !== null && ` / ${highestOutcome.np.toLocaleString()} NP`}
        </Text>
      )}
    </VStack>
  );
};

export default React.memo(SetPreview);
