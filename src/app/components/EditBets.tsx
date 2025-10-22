import {
  Box,
  Button,
  useDisclosure,
  Drawer,
  Flex,
  HStack,
  CloseButton,
  ScrollArea,
} from '@chakra-ui/react';
import React, { useCallback, useMemo, useState, useRef, Suspense } from 'react';
import { FaPenToSquare } from 'react-icons/fa6';

import BetFunctions from '../BetFunctions';
import { useRoundDataStore, useViewMode, useTableMode, useHasAnyBets } from '../stores';

import DropDownTable from './DropDownTable';
import NormalTable from './NormalTable';
import CopyDomainToggle from './TableSettings/CopyDomainToggle';
import Extras from './TableSettings/Extras';
import LogitModelToggle from './TableSettings/LogitModelToggle';
import TableModes from './TableSettings/TableModes';

import { useColorModeValue } from '@/components/ui/color-mode';

const BetAmountsSettings = React.lazy(() => import('./BetAmountsSettings'));
const PayoutCharts = React.lazy(() => import('./PayoutCharts'));
const PayoutTable = React.lazy(() => import('./PayoutTable'));
const TimelineContent = React.lazy(() => import('./TimelineContent'));

interface PirateTableProps {
  [key: string]: unknown; // Allow other props like m, px, etc.
}

const PirateTable = React.memo((props: PirateTableProps): React.ReactElement => {
  const tableMode = useTableMode();
  const { open, onOpen, setOpen } = useDisclosure();
  const [selectedTimeline, setSelectedTimeline] = useState<{
    arenaId: number | null;
    pirateIndex: number | null;
  }>({
    arenaId: null,
    pirateIndex: null,
  });
  const timelineRef = useRef<HTMLElement>(null);
  const openTimelineDrawer = useCallback(
    (arenaId: number | null = null, pirateIndex: number | null = null) => {
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
        <Drawer.Positioner padding={2}>
          <Drawer.Content rounded="md">
            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Drawer.CloseTrigger>
            <Suspense fallback={null}>
              <TimelineContent
                arenaId={selectedTimeline.arenaId}
                pirateIndex={selectedTimeline.pirateIndex}
              />
            </Suspense>
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
  // const isNormalMode = useMemo(() => tableMode === 'normal', [tableMode]);

  return (
    <>
      <Box display={isDropdownMode ? 'none' : 'block'}>
        <NormalTable timelineHandlers={timelineHandlers} {...props} />
      </Box>
      <Box display={isDropdownMode ? 'block' : 'none'}>
        <DropDownTable timelineHandlers={timelineHandlers} {...props} />
      </Box>
      {timelineDrawer}
    </>
  );
});

PirateTable.displayName = 'PirateTable';

export default React.memo(function EditBets(): React.ReactElement {
  const viewMode = useViewMode();
  const anyBets = useHasAnyBets();
  const setRoundState = useRoundDataStore(state => state.setRoundState);

  const shadowValue = useColorModeValue(
    '0 1px 2px rgba(0,0,0,0.02)',
    '0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -1px rgba(0,0,0,0.06)',
  );

  const handleEditModeClick = useCallback(() => {
    setRoundState({ viewMode: false });
  }, [setRoundState]);

  return (
    <>
      {viewMode && (
        <Box bgColor={'bg.emphasized'} p={4}>
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
            bg={'bg'}
            borderBottom="1px solid"
            borderColor={'border'}
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
              <LogitModelToggle />
              <CopyDomainToggle />
              <Extras />
            </HStack>
          </Box>
          <ScrollArea.Root width="full">
            <ScrollArea.Viewport>
              <ScrollArea.Content pb={4}>
                <PirateTable m={4} />
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="horizontal" />
          </ScrollArea.Root>
          <BetFunctions />
        </>
      )}

      {anyBets && (
        <>
          <Suspense fallback={null}>
            <BetAmountsSettings boxShadow="md" />
          </Suspense>

          <Suspense fallback={null}>
            <ScrollArea.Root width="full">
              <ScrollArea.Viewport>
                <ScrollArea.Content pt={4} pb={6}>
                  <PayoutTable />
                </ScrollArea.Content>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal" />
            </ScrollArea.Root>
          </Suspense>

          <Suspense fallback={null}>
            <ScrollArea.Root width="full">
              <ScrollArea.Viewport>
                <ScrollArea.Content pt={4} pb={6}>
                  <PayoutCharts />
                </ScrollArea.Content>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal" />
            </ScrollArea.Root>
          </Suspense>
        </>
      )}
    </>
  );
});
