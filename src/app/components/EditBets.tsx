import {
  Box,
  Button,
  useDisclosure,
  Drawer,
  Flex,
  Skeleton,
  Separator,
  HStack,
} from '@chakra-ui/react';
import React, { useCallback, useMemo, useState, useRef, Suspense } from 'react';
import { FaPenToSquare } from 'react-icons/fa6';

import BetFunctions from '../BetFunctions';
import { useRoundDataStore, useViewMode, useTableMode, useHasAnyBets } from '../stores';
import { useTableColors } from '../util';

import BetAmountsSettings from './BetAmountsSettings';
import DropDownTable from './DropDownTable';
import HorizontalScrollingBox from './HorizontalScrollingBox';
import NormalTable from './NormalTable';
import CopyDomainToggle from './TableSettings/CopyDomainToggle';
import Extras from './TableSettings/Extras';
import LogitModelToggle from './TableSettings/LogitModelToggle';
import TableModes from './TableSettings/TableModes';
import TimelineContent from './TimelineContent';

import { useColorModeValue } from '@/components/ui/color-mode';

const PayoutCharts = React.lazy(() => import('./PayoutCharts'));
const PayoutTable = React.lazy(() => import('./PayoutTable'));

interface PirateTableProps {
  [key: string]: unknown; // Allow other props like m, px, etc.
}

const PirateTable = React.memo((props: PirateTableProps): React.ReactElement => {
  const tableMode = useTableMode();
  const { open, onOpen, setOpen } = useDisclosure();
  const [selectedTimeline, setSelectedTimeline] = useState({
    arenaId: 0,
    pirateIndex: 0,
  });
  const timelineRef = useRef<HTMLElement>(null);

  const openTimelineDrawer = useCallback(
    (arenaId: number, pirateIndex: number) => {
      setSelectedTimeline({ arenaId, pirateIndex });
      onOpen();
    },
    [onOpen],
  );

  const timelineDrawer = useMemo(
    () => (
      <Drawer.Root
        open={open}
        placement="end"
        onOpenChange={(e: { open: boolean }) => setOpen(e.open)}
        size="md"
      >
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Timeline</Drawer.Title>
              <Drawer.CloseTrigger />
            </Drawer.Header>
            <Drawer.Body>
              <TimelineContent
                arenaId={selectedTimeline.arenaId}
                pirateIndex={selectedTimeline.pirateIndex}
              />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    ),
    [open, setOpen, selectedTimeline.arenaId, selectedTimeline.pirateIndex],
  );

  const timelineHandlers = useMemo(
    () => ({
      openTimelineDrawer,
      timelineRef,
    }),
    [openTimelineDrawer, timelineRef],
  );

  const isDropdownMode = useMemo(() => tableMode === 'dropdown', [tableMode]);
  const isNormalMode = useMemo(() => tableMode === 'normal', [tableMode]);

  return (
    <>
      {/* Conditional rendering to completely avoid layering conflicts */}
      {isNormalMode && <NormalTable timelineHandlers={timelineHandlers} {...props} />}
      {isDropdownMode && <DropDownTable timelineHandlers={timelineHandlers} {...props} />}
      {timelineDrawer}
    </>
  );
});

PirateTable.displayName = 'PirateTable';

export default React.memo(function EditBets(): React.ReactElement {
  const viewMode = useViewMode();
  const anyBets = useHasAnyBets();
  const setRoundState = useRoundDataStore(state => state.setRoundState);

  const colors = useTableColors();

  const settingsBg = useColorModeValue('white', '#1c2130');
  const borderColor = useColorModeValue('blue.100', 'blue.900');
  const dividerColor = useColorModeValue('gray.300', 'gray.600');
  const shadowValue = useColorModeValue(
    '0 1px 2px rgba(0,0,0,0.02)',
    '0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -1px rgba(0,0,0,0.06)',
  );

  const handleEditModeClick = useCallback(() => {
    setRoundState({ viewMode: false });
  }, [setRoundState]);

  const ChartsFallback = <Skeleton height="400px" />;
  const TableFallback = <Skeleton height="300px" />;

  return (
    <>
      {viewMode && (
        <Box bgColor={colors.blue} p={4}>
          <Button colorPalette="blackAlpha" onClick={handleEditModeClick}>
            <FaPenToSquare />
            Edit these bets
          </Button>
        </Box>
      )}

      {!viewMode && (
        <>
          <Box
            w="100%"
            py={{ base: 2, md: 2.5 }}
            bg={settingsBg}
            borderBottom="1px solid"
            borderColor={borderColor}
            mb={3}
            boxShadow={shadowValue}
          >
            {/* Mobile Layout (will be hidden on md and larger screens) */}
            <Flex
              direction="column"
              px={4}
              py={1}
              maxW="container.xl"
              mx="auto"
              display={{ base: 'flex', md: 'none' }}
            >
              <Box mb={2}>
                <TableModes />
              </Box>

              <Box mb={2}>
                <LogitModelToggle />
              </Box>

              <Box mb={2}>
                <CopyDomainToggle />
              </Box>

              <Box>
                <Extras />
              </Box>
            </Flex>

            {/* Desktop Layout (will be hidden on smaller than md screens) */}
            <HStack px={5} display={{ base: 'none', md: 'flex' }}>
              <TableModes />
              {/* <Separator orientation="vertical" colorScheme="blue" h="18px" mx={4}/> */}
              <LogitModelToggle />

              {/* <Separator orientation="vertical" colorScheme="blue" h="18px" mx={4} /> */}
              <CopyDomainToggle />

              {/* <Separator orientation="vertical" colorScheme="blue" h="18px" mx={4} /> */}
              <Extras />
            </HStack>
          </Box>
          <HorizontalScrollingBox>
            <PirateTable m={4} />
          </HorizontalScrollingBox>
          <BetFunctions />
        </>
      )}

      {anyBets && (
        <>
          <BetAmountsSettings boxShadow="md" />

          <Suspense fallback={TableFallback}>
            <HorizontalScrollingBox py={4}>
              <PayoutTable />
            </HorizontalScrollingBox>
          </Suspense>

          <Suspense fallback={ChartsFallback}>
            <HorizontalScrollingBox py={4}>
              <PayoutCharts />
            </HorizontalScrollingBox>
          </Suspense>
        </>
      )}
    </>
  );
});
