import { Box, Radiomark } from '@chakra-ui/react';
import React, { useCallback } from 'react';

import { useIsPirateSelected, useUpdateSinglePirate } from '../../stores';

interface BetRadioProps {
  betIndex: number;
  arenaIndex: number;
  pirateIndex: number;
}

// The bet radios form a grid inside each arena's radiogroup (the <tbody>): one
// column per bet, and the rows are the "clear" row plus each pirate row. To
// move focus with arrow keys we derive a radio's position from the DOM table
// structure (radios grouped by their <tr>), so we don't have to stamp data
// attributes onto the components (Chakra's Box doesn't forward arbitrary
// data-* props to the DOM).
function getRadioGrid(
  el: HTMLElement,
): { rows: HTMLElement[][]; rowIdx: number; colIdx: number } | null {
  const group = el.closest('[role="radiogroup"]');
  if (!group) {
    return null;
  }

  const rows: HTMLElement[][] = [];
  for (const tr of Array.from(group.querySelectorAll('tr'))) {
    const radios = Array.from(tr.querySelectorAll<HTMLElement>('[role="radio"]'));
    if (radios.length > 0) {
      rows.push(radios);
    }
  }

  const rowIdx = rows.findIndex(row => row.includes(el));
  if (rowIdx === -1) {
    return null;
  }

  const colIdx = rows[rowIdx]?.indexOf(el) ?? -1;
  if (colIdx === -1) {
    return null;
  }

  return { rows, rowIdx, colIdx };
}

function focusSiblingRadio(el: HTMLElement, dRow: number, dCol: number): void {
  const grid = getRadioGrid(el);
  if (!grid) {
    return;
  }

  const targetRow = grid.rows[grid.rowIdx + dRow];
  if (!targetRow) {
    return;
  }

  targetRow[grid.colIdx + dCol]?.focus();
}

function handleRadioKeyDown(e: React.KeyboardEvent, onActivate: () => void): void {
  const el = e.currentTarget as HTMLElement;

  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      onActivate();
      return;
    // Arrow keys move focus only (they do NOT change the selection, so a bet
    // can't be accidentally corrupted while navigating). Enter/Space select.
    case 'ArrowLeft':
      e.preventDefault();
      focusSiblingRadio(el, 0, -1);
      return;
    case 'ArrowRight':
      e.preventDefault();
      focusSiblingRadio(el, 0, 1);
      return;
    case 'ArrowUp':
      e.preventDefault();
      focusSiblingRadio(el, -1, 0);
      return;
    case 'ArrowDown':
      e.preventDefault();
      focusSiblingRadio(el, 1, 0);
      break;
    default:
      break;
  }
}

const BetRadio = React.memo(
  ({ betIndex, arenaIndex, pirateIndex }: BetRadioProps): React.ReactElement => {
    const isSelected = useIsPirateSelected(betIndex, arenaIndex, pirateIndex);
    const updateSinglePirate = useUpdateSinglePirate();

    const handleChange = useCallback(() => {
      updateSinglePirate(betIndex, arenaIndex, pirateIndex);
    }, [betIndex, arenaIndex, pirateIndex, updateSinglePirate]);

    return (
      <Box
        as="button"
        onClick={handleChange}
        onKeyDown={e => handleRadioKeyDown(e, handleChange)}
        role="radio"
        aria-checked={isSelected}
        aria-label={`Bet ${betIndex}`}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        p={0}
        bg="transparent"
        border="none"
        cursor="pointer"
        css={{
          '& *': { cursor: 'pointer' },
        }}
      >
        <Radiomark checked={isSelected} size="sm" cursor="pointer" />
      </Box>
    );
  },
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex &&
    prevProps.arenaIndex === nextProps.arenaIndex &&
    prevProps.pirateIndex === nextProps.pirateIndex,
);

BetRadio.displayName = 'BetRadio';

export const ClearRadio = React.memo(
  ({ betIndex, arenaIndex }: { betIndex: number; arenaIndex: number }): React.ReactElement => {
    const isClearSelected = useIsPirateSelected(betIndex, arenaIndex, 0);
    const updateSinglePirate = useUpdateSinglePirate();

    const handleChange = useCallback(() => {
      updateSinglePirate(betIndex, arenaIndex, 0);
    }, [betIndex, arenaIndex, updateSinglePirate]);

    return (
      <Box
        as="button"
        onClick={handleChange}
        onKeyDown={e => handleRadioKeyDown(e, handleChange)}
        role="radio"
        aria-checked={isClearSelected}
        aria-label={`Bet ${betIndex}: no pirate`}
        display="inline-flex"
        alignItems="center"
        justifyContent="center"
        p={0}
        bg="transparent"
        border="none"
        cursor="pointer"
        css={{
          '& *': { cursor: 'pointer' },
        }}
      >
        <Radiomark checked={isClearSelected} size="sm" cursor="pointer" />
      </Box>
    );
  },
  (prevProps, nextProps) =>
    prevProps.betIndex === nextProps.betIndex && prevProps.arenaIndex === nextProps.arenaIndex,
);

ClearRadio.displayName = 'ClearRadio';

export default BetRadio;
