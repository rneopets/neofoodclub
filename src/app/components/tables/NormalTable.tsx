import { Box, Button, Table } from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';
import { FaChartLine } from 'react-icons/fa6';

import { ARENA_NAMES } from '../../constants';
import {
  useFaDetails,
  useBetCount,
  useOddsTimeline,
  useLogitModelSetting,
  useChanges,
  useUpdateSinglePirate,
  useBigBrain,
  useCustomOddsMode,
} from '../../stores';
import ClearBetsButton from '../bets/ClearBetsButton';
import TextTooltip from '../ui/TextTooltip';

import ArenaTableBody from './ArenaTableBody';

interface NormalTableProps {
  timelineHandlers: {
    openTimelineDrawer: (arenaId: number | null, pirateIndex: number | null) => void;
  };
}

const NormalTable = React.memo((props: NormalTableProps): React.ReactElement => {
  const { timelineHandlers } = props;

  const changes = useChanges();
  const useLogitModel = useLogitModelSetting();
  const oddsTimeline = useOddsTimeline();
  const bigBrain = useBigBrain();
  const faDetails = useFaDetails();
  const customOddsMode = useCustomOddsMode();
  const betCount = useBetCount();
  const updateSinglePirate = useUpdateSinglePirate();
  const { openTimelineDrawer } = timelineHandlers;

  const amountOfChanges = changes?.length ?? 0;

  const handleBetLineChange = useCallback(
    (arenaIndex: number, pirateValue: number) => {
      for (let betIndex = 1; betIndex <= 10; betIndex++) {
        updateSinglePirate(betIndex, arenaIndex, pirateValue);
      }
    },
    [updateSinglePirate],
  );

  const handleTimelineClick = useCallback(
    (arenaId: number, pirateIndex: number) => {
      openTimelineDrawer(arenaId, pirateIndex);
    },
    [openTimelineDrawer],
  );

  const probsHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    if (useLogitModel) {
      return <Table.ColumnHeader>Prob</Table.ColumnHeader>;
    }

    return (
      <>
        <Table.ColumnHeader textAlign="center">Min Prob</Table.ColumnHeader>
        <Table.ColumnHeader textAlign="center">Max Prob</Table.ColumnHeader>
        <Table.ColumnHeader textAlign="center">Std Prob</Table.ColumnHeader>
      </>
    );
  }, [bigBrain, useLogitModel]);

  const payoutHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    return <Table.ColumnHeader textAlign="center">Payout</Table.ColumnHeader>;
  }, [bigBrain]);

  const customOddsHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    if (!customOddsMode) {
      return null;
    }

    return <Table.ColumnHeader textAlign="center">Custom Odds</Table.ColumnHeader>;
  }, [bigBrain, customOddsMode]);

  const customProbsHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    if (!customOddsMode) {
      return null;
    }

    return (
      <Table.ColumnHeader textAlign="center">
        <TextTooltip text="Custom Prob" content="Custom Probability" />
      </Table.ColumnHeader>
    );
  }, [bigBrain, customOddsMode]);

  const faDetailsHeaders = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    if (!faDetails) {
      return null;
    }

    return <Table.ColumnHeader colSpan={10}>FA Explanation</Table.ColumnHeader>;
  }, [bigBrain, faDetails]);

  const faHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    return (
      <Table.ColumnHeader>
        <TextTooltip text="FA" content="Food Adjustment" />
      </Table.ColumnHeader>
    );
  }, [bigBrain]);

  const handleOverallTimelineClick = useCallback(() => {
    openTimelineDrawer(null, null);
  }, [openTimelineDrawer]);

  const oddsTimelineHeader = useMemo(() => {
    if (!oddsTimeline) {
      return null;
    }

    return (
      <Table.ColumnHeader minW="300px">
        <Button
          size="xs"
          variant="ghost"
          onClick={handleOverallTimelineClick}
          display="flex"
          alignItems="center"
          gap={2}
        >
          <FaChartLine />
          Odds Timeline ({amountOfChanges} change{amountOfChanges === 1 ? '' : 's'})
        </Button>
      </Table.ColumnHeader>
    );
  }, [oddsTimeline, amountOfChanges, handleOverallTimelineClick]);

  const tableHeader = React.useMemo(
    () => (
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader textAlign="center">Arena</Table.ColumnHeader>
          <Table.ColumnHeader textAlign="center">Pirate</Table.ColumnHeader>
          {probsHeader}
          {customProbsHeader}
          {payoutHeader}
          {faHeader}
          {faDetailsHeaders}
          <Table.ColumnHeader textAlign="center">
            <TextTooltip text="Open" content="Opening Odds" />
          </Table.ColumnHeader>
          <Table.ColumnHeader textAlign="center">
            <TextTooltip text="Curr" content="Current Odds" />
          </Table.ColumnHeader>
          {customOddsHeader}
          {oddsTimelineHeader}
          {[...Array(betCount)].map((_e, i) => (
            <Table.ColumnHeader
              // eslint-disable-next-line react/no-array-index-key
              key={`bet-header-${i}`}
              whiteSpace="normal"
              textAlign="center"
              px={2}
            >
              <Box as="span" display="inline-block" maxW="100%">
                Bet {i + 1}
              </Box>
            </Table.ColumnHeader>
          ))}
          <Table.ColumnHeader px={1}>
            <ClearBetsButton minW="100%" />
          </Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
    ),
    [
      betCount,
      faDetailsHeaders,
      payoutHeader,
      probsHeader,
      customProbsHeader,
      customOddsHeader,
      oddsTimelineHeader,
      faHeader,
    ],
  );

  const tableBodies = React.useMemo(
    () =>
      // TODO: these handles could probably be deeper in the component tree
      ARENA_NAMES.map((_arenaName, arenaId) => (
        <ArenaTableBody
          // eslint-disable-next-line react/no-array-index-key
          key={`arena-${arenaId}`}
          arenaId={arenaId}
          handleTimelineClick={handleTimelineClick}
          handleBetLineChange={handleBetLineChange}
        />
      )),
    [handleBetLineChange, handleTimelineClick],
  );

  return (
    <Table.Root size="sm" width="auto">
      {tableHeader}
      {tableBodies}
    </Table.Root>
  );
});

NormalTable.displayName = 'NormalTable';

export default NormalTable;
