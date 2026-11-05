import { Badge, HStack, Text, VStack } from '@chakra-ui/react';
import React from 'react';
import {
  FaBullseye,
  FaCircleHalfStroke,
  FaScaleBalanced,
  FaSkull,
  FaTrophy,
} from 'react-icons/fa6';

import { displayAsPercent } from '../../util';
import type { SetPreviewSummary } from '../../utils/setPreview';

const pct = (v: number): string => displayAsPercent(v, 3);

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
        <Badge
          variant="surface"
          {...(summary.bustRate > 0.99 ? { colorPalette: 'nfc-red' } : {})}
          data-testid="preview-bust"
        >
          <FaSkull />
          Bust: {pct(summary.bustRate)}
        </Badge>
        {summary.partialRate > 0 && (
          <Badge variant="surface" data-testid="preview-partial">
            <FaCircleHalfStroke />
            Partial: {pct(summary.partialRate)}
          </Badge>
        )}
        <Badge
          variant="surface"
          {...(er !== null && er < 1 ? { colorPalette: 'nfc-red' } : {})}
          data-testid="preview-er"
        >
          <FaScaleBalanced />
          ER: {er === null ? '-' : er.toFixed(3)}
        </Badge>
      </HStack>
      {likelyWinner && (
        <HStack gap={1.5} fontSize="sm" data-testid="preview-likely">
          <FaBullseye />
          <Text>
            Most likely winner: {likelyWinner.units.toFixed(0)} units (
            {pct(likelyWinner.probability)})
            {likelyWinner.np !== null && ` / ${likelyWinner.np.toLocaleString()} NP`}
          </Text>
        </HStack>
      )}
      {highestOutcome && (
        <HStack gap={1.5} fontSize="sm" data-testid="preview-highest">
          <FaTrophy />
          <Text>
            Highest outcome: {highestOutcome.units.toFixed(0)} units (
            {pct(highestOutcome.probability)})
            {highestOutcome.np !== null && ` / ${highestOutcome.np.toLocaleString()} NP`}
          </Text>
        </HStack>
      )}
    </VStack>
  );
};

export default React.memo(SetPreview);
