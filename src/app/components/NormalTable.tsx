import { Box, Table, Th, Thead, Tr } from '@chakra-ui/react';
import React, { useCallback, useMemo } from 'react';

import { ARENA_NAMES } from '../constants';
import {
  useFaDetails,
  useBetCount,
  useOddsTimeline,
  useLogitModelSetting,
  useChanges,
  useUpdateSinglePirate,
  useBigBrain,
  useCustomOddsMode,
} from '../stores';

import ClearBetsButton from './ClearBetsButton';
import ArenaTableBody from './tables/ArenaTableBody';
import TextTooltip from './TextTooltip';

interface NormalTableProps {
  timelineHandlers: {
    openTimelineDrawer: (arenaId: number, pirateIndex: number) => void;
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
      return <Th>Prob</Th>;
    }

    return (
      <>
        <Th textAlign="center">Min Prob</Th>
        <Th textAlign="center">Max Prob</Th>
        <Th textAlign="center">Std Prob</Th>
      </>
    );
  }, [bigBrain, useLogitModel]);

  const payoutHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    return <Th textAlign="center">Payout</Th>;
  }, [bigBrain]);

  const customOddsHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    if (!customOddsMode) {
      return null;
    }

    return <Th textAlign="center">Custom Odds</Th>;
  }, [bigBrain, customOddsMode]);

  const customProbsHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    if (!customOddsMode) {
      return null;
    }

    return (
      <Th textAlign="center">
        <TextTooltip text="Custom Prob" label="Custom Std. Probability" />
      </Th>
    );
  }, [bigBrain, customOddsMode]);

  const faDetailsHeaders = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    if (!faDetails) {
      return null;
    }

    return <Th colSpan={10}>FA Explanation</Th>;
  }, [bigBrain, faDetails]);

  const faHeader = useMemo(() => {
    if (!bigBrain) {
      return null;
    }

    return (
      <Th>
        <TextTooltip text="FA" label="Food Adjustment" />
      </Th>
    );
  }, [bigBrain]);

  const oddsTimelineHeader = useMemo(() => {
    if (!oddsTimeline) {
      return null;
    }

    const text = `Odds Timeline (${amountOfChanges} change${amountOfChanges === 1 ? '' : 's'})`;

    return <Th minW="300px">{text}</Th>;
  }, [oddsTimeline, amountOfChanges]);

  const tableHeader = React.useMemo(
    () => (
      <Thead>
        <Tr>
          <Th textAlign="center">Arena</Th>
          <Th textAlign="center">Pirate</Th>
          {probsHeader}
          {customProbsHeader}
          {payoutHeader}
          {faHeader}
          {faDetailsHeaders}
          <Th textAlign="center">
            <TextTooltip text="Open" label="Opening Odds" />
          </Th>
          <Th textAlign="center">
            <TextTooltip text="Curr" label="Current Odds" />
          </Th>
          {customOddsHeader}
          {oddsTimelineHeader}
          {[...Array(betCount)].map((_e, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <Th key={`bet-header-${i}`} whiteSpace="normal" textAlign="center" px={2}>
              <Box as="span" display="inline-block" maxW="100%">
                Bet {i + 1}
              </Box>
            </Th>
          ))}
          <Th px={1}>
            <ClearBetsButton minW="100%" colorScheme="red" />
          </Th>
        </Tr>
      </Thead>
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
    <Table size="sm" width="auto">
      {tableHeader}
      {tableBodies}
    </Table>
  );
});

NormalTable.displayName = 'NormalTable';

export default NormalTable;
