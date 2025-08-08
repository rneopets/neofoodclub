import { Badge, Skeleton, Table, Text } from '@chakra-ui/react';
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
    loaded,
    onChange,
  }: {
    betNum: number;
    arenaId: number;
    pirateValue: number;
    loaded: boolean;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  }) => (
    <Pd key={`bet-${betNum}-arena-${arenaId}`}>
      <Skeleton loading={!loaded} height="24px">
        <PirateSelect arenaId={arenaId} pirateValue={pirateValue} onChange={onChange} />
      </Skeleton>
    </Pd>
  ),
  (prevProps, nextProps) =>
    prevProps.pirateValue === nextProps.pirateValue &&
    prevProps.loaded === nextProps.loaded &&
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
    const loaded = useIsCalculated();

    return (
      <Table.Row>
        {ARENA_NAMES.map((_, arenaId) => {
          const selectedPirate = currentBetLine[arenaId] || 0;

          return (
            <BetRow
              // eslint-disable-next-line react/no-array-index-key
              key={`bet-${betNum}-arena-${arenaId}`}
              betNum={betNum}
              arenaId={arenaId}
              pirateValue={selectedPirate}
              loaded={loaded}
              onChange={rowHandlers[arenaId]!}
            />
          );
        })}
        <Pd>{isBetDuplicate(thisBetBinary) && <DuplicateBadge />}</Pd>
      </Table.Row>
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
      <Table.Row
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
        <Pd style={{ textAlign: 'end' }}>{opening}:1</Pd>
        <Pd style={{ textAlign: 'end' }}>
          <Text fontWeight={current === opening ? 'normal' : 'bold'}>{current}:1</Text>
        </Pd>
      </Table.Row>
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
      <Table.ColumnHeader whiteSpace="nowrap">
        {ARENA_NAMES[arenaId]} {arenaRatioString}
      </Table.ColumnHeader>
    );
  },
  (prevProps, nextProps) => prevProps.arenaId === nextProps.arenaId,
);

TableHeaderCell.displayName = 'TableHeaderCell';

const ClearButtonHeader = React.memo(() => (
  <Table.ColumnHeader px={1}>
    <ClearBetsButton minW="100%" colorPalette="red" />
  </Table.ColumnHeader>
));

ClearButtonHeader.displayName = 'ClearButtonHeader';

const DuplicateBadge = React.memo(() => (
  <Badge colorPalette="red" variant="subtle" fontSize="xs">
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
    const pirates = roundPirates?.[arenaId] ?? makeEmpty(4);
    const hasPirates = pirates && pirates.some(pirateId => pirateId > 0);

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
        <Skeleton loading={!hasPirates}>
          <Table.Root
            size="sm"
            maxW="150px"
            height="fit-content"
            overflow="hidden"
          >
            <Table.Body overflow="hidden" height="fit-content" maxHeight="100px">
              {pirateRows}
            </Table.Body>
          </Table.Root>
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
      <Table.Row>
        {arenaCells}
        <Pd>{/* Empty cell for duplicate badge column alignment */}</Pd>
      </Table.Row>
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
        <Table.Header>
          <Table.Row>
            {Array.from({ length: 5 }, (_, arenaId) => (
              <TableHeaderCell key={`dropdown-arena-${arenaId}`} arenaId={arenaId} />
            ))}
            <ClearButtonHeader />
          </Table.Row>
        </Table.Header>
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
      <Table.Root size="sm" width="auto" height="fit-content" maxHeight="60vh" overflow="hidden">
        {tableHeader}
        <Table.Body overflow="hidden" height="fit-content" maxHeight="50vh">
          <ArenaRow createTimelineClickHandler={createTimelineClickHandler} />
          {betRows}
        </Table.Body>
      </Table.Root>
    );
  },
  (prevProps, nextProps) =>
    prevProps.timelineHandlers.openTimelineDrawer === nextProps.timelineHandlers.openTimelineDrawer,
);

DropDownTable.displayName = 'DropDownTable';

export default DropDownTable;
