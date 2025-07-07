import { Badge, Skeleton, Table, Tbody, Text, Th, Thead, Tr } from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';

import { ARENA_NAMES, PIRATE_NAMES, FULL_PIRATE_NAMES } from '../constants';
import { useGetPirateBgColor } from '../hooks/useGetPirateBgColor';
import { computePirateBinary, makeEmpty } from '../maths';
import {
  useUpdateSinglePirate,
  useArenaRatios,
  useRoundPirates,
  useRoundOpeningOdds,
  useRoundCurrentOdds,
  useBetCount,
  useBetBinaries,
  useBetLineSpecific,
  useSpecificBetBinary,
  useIsCalculated,
  useWinningBetBinary,
  useBigBrain,
} from '../stores';
import { displayAsPercent, useTableColors } from '../util';

import ClearBetsButton from './ClearBetsButton';
import Pd from './Pd';
import PirateSelect from './PirateSelect';

interface DropDownTableProps {
  timelineHandlers: {
    openTimelineDrawer: (arenaId: number, pirateIndex: number) => void;
  };
}

const BetRow = React.memo(
  ({
    betNum,
    arenaId,
    pirateValue,
    isLoaded,
    onChange,
  }: {
    betNum: number;
    arenaId: number;
    pirateValue: number;
    isLoaded: boolean;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  }) => (
    <Pd key={`bet-${betNum}-arena-${arenaId}`}>
      <Skeleton isLoaded={isLoaded} height="24px">
        <PirateSelect arenaId={arenaId} pirateValue={pirateValue} onChange={onChange} />
      </Skeleton>
    </Pd>
  ),
  (prevProps, nextProps) =>
    prevProps.pirateValue === nextProps.pirateValue &&
    prevProps.isLoaded === nextProps.isLoaded &&
    prevProps.onChange === nextProps.onChange,
);

BetRow.displayName = 'BetRow';

const DropDownTableRow = React.memo(
  ({
    betNum,
    rowHandlers,
    isBetDuplicate,
  }: {
    betNum: number;
    rowHandlers: ((e: React.ChangeEvent<HTMLSelectElement>) => void)[];
    isBetDuplicate: (betBinary: number) => boolean;
  }) => {
    const currentBetLine = useBetLineSpecific(betNum + 1);
    const thisBetBinary = useSpecificBetBinary(betNum + 1);
    const isLoaded = useIsCalculated();

    return (
      <Tr>
        {ARENA_NAMES.map((_, arenaId) => {
          const selectedPirate = currentBetLine[arenaId] || 0;

          return (
            <BetRow
              // eslint-disable-next-line react/no-array-index-key
              key={`bet-${betNum}-arena-${arenaId}`}
              betNum={betNum}
              arenaId={arenaId}
              pirateValue={selectedPirate}
              isLoaded={isLoaded}
              onChange={rowHandlers[arenaId]!}
            />
          );
        })}
        <Pd>{isBetDuplicate(thisBetBinary) && <DuplicateBadge />}</Pd>
      </Tr>
    );
  },
);

DropDownTableRow.displayName = 'DropDownTableRow';

const PirateInfoRow = React.memo(
  ({
    pirateId,
    pirateIndex,
    arenaId,
    onClick,
  }: {
    pirateId: number;
    pirateIndex: number;
    arenaId: number;
    onClick: () => void;
  }) => {
    const { green } = useTableColors();
    const getPirateBgColor = useGetPirateBgColor();
    const winningBetBinary = useWinningBetBinary();
    const openingOdds = useRoundOpeningOdds()[arenaId] ?? makeEmpty(5);
    const currentOdds = useRoundCurrentOdds()[arenaId] ?? makeEmpty(5);
    const pirateBinary = computePirateBinary(arenaId, pirateIndex + 1);
    const didPirateWin = (winningBetBinary & pirateBinary) === pirateBinary;
    const opening = openingOdds[pirateIndex + 1] as number;
    const current = currentOdds[pirateIndex + 1] as number;

    const fullPirateName = FULL_PIRATE_NAMES.get(pirateId) as string;
    const pirateName = PIRATE_NAMES.get(pirateId) as string;

    return (
      <Tr
        key={`pirate-${pirateId}-${arenaId}-${pirateIndex}`}
        backgroundColor={didPirateWin ? green : 'transparent'}
      >
        <Pd
          whiteSpace="nowrap"
          backgroundColor={didPirateWin ? green : getPirateBgColor(opening)}
          onClick={onClick}
          cursor="pointer"
          title={`Click to view odds timeline for ${fullPirateName}`}
        >
          {pirateName}
        </Pd>
        <Pd isNumeric>{opening}:1</Pd>
        <Pd isNumeric>
          <Text fontWeight={current === opening ? 'normal' : 'bold'}>{current}:1</Text>
        </Pd>
      </Tr>
    );
  },
  (prevProps, nextProps) =>
    prevProps.pirateId === nextProps.pirateId &&
    prevProps.arenaId === nextProps.arenaId &&
    prevProps.pirateIndex === nextProps.pirateIndex &&
    prevProps.onClick === nextProps.onClick,
);

PirateInfoRow.displayName = 'PirateInfoRow';

const TableHeaderCell = React.memo(
  ({ arenaId }: { arenaId: number }) => {
    const arenaRatios = useArenaRatios();
    const bigBrain = useBigBrain();
    const arenaRatioString = bigBrain
      ? `(${displayAsPercent(arenaRatios[arenaId] as number, 1)})`
      : '';

    return (
      <Th whiteSpace="nowrap">
        {ARENA_NAMES[arenaId]} {arenaRatioString}
      </Th>
    );
  },
  (prevProps, nextProps) => prevProps.arenaId === nextProps.arenaId,
);

TableHeaderCell.displayName = 'TableHeaderCell';

const ClearButtonHeader = React.memo(() => (
  <Th px={1}>
    <ClearBetsButton minW="100%" colorScheme="red" />
  </Th>
));

ClearButtonHeader.displayName = 'ClearButtonHeader';

const DuplicateBadge = React.memo(() => (
  <Badge colorScheme="red" variant="subtle" fontSize="xs">
    ❌ Duplicate
  </Badge>
));

DuplicateBadge.displayName = 'DuplicateBadge';

const ArenaCell = React.memo(
  ({
    arenaId,
    createTimelineClickHandler,
  }: {
    arenaId: number;
    createTimelineClickHandler: (arena: number, pirateIndex: number) => () => void;
  }) => {
    const roundPirates = useRoundPirates();
    const pirates = roundPirates[arenaId] ?? makeEmpty(4);
    const isLoaded = Boolean(pirates[0]);

    const pirateRows = useMemo(
      () =>
        pirates.map((pirateId: number, pirateIndex: number) => {
          const onClick = createTimelineClickHandler(arenaId, pirateIndex);

          return (
            <PirateInfoRow
              // eslint-disable-next-line react/no-array-index-key
              key={`pirate-${pirateId}-${arenaId}-${pirateIndex}`}
              pirateId={pirateId}
              pirateIndex={pirateIndex}
              arenaId={arenaId}
              onClick={onClick}
            />
          );
        }),
      [pirates, arenaId, createTimelineClickHandler],
    );

    return (
      <Pd key={`arena-${arenaId}`}>
        <Skeleton isLoaded={isLoaded}>
          <Table size="sm" maxW="150px">
            <Tbody>{pirateRows}</Tbody>
          </Table>
        </Skeleton>
      </Pd>
    );
  },
  (prevProps, nextProps) =>
    prevProps.arenaId === nextProps.arenaId &&
    prevProps.createTimelineClickHandler === nextProps.createTimelineClickHandler,
);

ArenaCell.displayName = 'ArenaCell';

const ArenaRow = React.memo(
  ({
    createTimelineClickHandler,
  }: {
    createTimelineClickHandler: (arenaId: number, pirateIndex: number) => () => void;
  }) => {
    const arenaCells = useMemo(
      () =>
        [...Array(5)].map((_, arenaId) => (
          <ArenaCell
            // eslint-disable-next-line react/no-array-index-key
            key={`arena-cell-${arenaId}`}
            arenaId={arenaId}
            createTimelineClickHandler={createTimelineClickHandler}
          />
        )),
      [createTimelineClickHandler],
    );

    return (
      <Tr>
        {arenaCells}
        <Pd>{/* Empty cell for duplicate badge column alignment */}</Pd>
      </Tr>
    );
  },
);

ArenaRow.displayName = 'ArenaRow';

const DropDownTable = React.memo(
  (props: DropDownTableProps): React.ReactElement => {
    const { timelineHandlers } = props;

    const amountOfBets = useBetCount();
    const betBinariesMap = useBetBinaries();
    const updateSinglePirate = useUpdateSinglePirate();

    const duplicateBinaries = useMemo(() => {
      const seen = new Set<number>();
      const duplicates = new Set<number>();
      for (const binary of betBinariesMap.values()) {
        if (binary > 0) {
          if (seen.has(binary)) {
            duplicates.add(binary);
          } else {
            seen.add(binary);
          }
        }
      }
      return Array.from(duplicates);
    }, [betBinariesMap]);

    const isBetDuplicate = useCallback(
      (betBinary: number): boolean => duplicateBinaries.includes(betBinary),
      [duplicateBinaries],
    );

    const { openTimelineDrawer } = timelineHandlers;

    const handleTimelineClick = useCallback(
      (arenaId: number, pirateIndex: number) => {
        openTimelineDrawer(arenaId, pirateIndex);
      },
      [openTimelineDrawer],
    );

    const createTimelineClickHandler = useCallback(
      (arenaId: number, pirateIndex: number) => (): void => {
        handleTimelineClick(arenaId, pirateIndex);
      },
      [handleTimelineClick],
    );

    const handlePirateSelect = useCallback(
      (betNum: number, arenaId: number, value: number) => {
        updateSinglePirate(betNum + 1, arenaId, value);
      },
      [updateSinglePirate],
    );

    const createHandleChange = useCallback(
      (betNum: number, arenaId: number) =>
        (e: React.ChangeEvent<HTMLSelectElement>): void => {
          handlePirateSelect(betNum, arenaId, parseInt(e.target.value));
        },
      [handlePirateSelect],
    );

    const tableHeader = useMemo(
      () => (
        <Thead>
          <Tr>
            {Array.from({ length: 5 }, (_, arenaId) => (
              <TableHeaderCell key={`dropdown-arena-${arenaId}`} arenaId={arenaId} />
            ))}
            <ClearButtonHeader />
          </Tr>
        </Thead>
      ),
      [],
    );

    const allRowHandlers = useMemo(
      () =>
        [...Array(10)].map((_, betNum) =>
          // eslint-disable-next-line no-shadow
          Array.from({ length: 5 }, (_, arenaId) => createHandleChange(betNum, arenaId)),
        ),
      [createHandleChange],
    );

    const betRows = useMemo(
      () =>
        [...Array(amountOfBets)].map((_bet, betNum) => {
          const rowHandlers = allRowHandlers[betNum]!;

          return (
            <DropDownTableRow
              // eslint-disable-next-line react/no-array-index-key
              key={`dropdown-bet-${betNum}`}
              betNum={betNum}
              rowHandlers={rowHandlers}
              isBetDuplicate={isBetDuplicate}
            />
          );
        }),
      [amountOfBets, allRowHandlers, isBetDuplicate],
    );

    return (
      <Table size="sm" width="auto">
        {tableHeader}
        <Tbody>
          <ArenaRow createTimelineClickHandler={createTimelineClickHandler} />
          {betRows}
        </Tbody>
      </Table>
    );
  },
  (prevProps, nextProps) =>
    prevProps.timelineHandlers.openTimelineDrawer === nextProps.timelineHandlers.openTimelineDrawer,
);

DropDownTable.displayName = 'DropDownTable';

export default DropDownTable;
