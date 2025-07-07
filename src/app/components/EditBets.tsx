import {
  Box,
  Button,
  Icon,
  Collapse,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Flex,
  useColorModeValue,
  Skeleton,
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

const PayoutCharts = React.lazy(() => import('./PayoutCharts'));
const PayoutTable = React.lazy(() => import('./PayoutTable'));

interface PirateTableProps {
  [key: string]: unknown; // Allow other props like m, px, etc.
}

const PirateTable = React.memo((props: PirateTableProps): React.ReactElement => {
  const tableMode = useTableMode();
  const { isOpen, onOpen, onClose } = useDisclosure();
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
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        // @ts-ignore
        finalFocusRef={timelineRef}
        size="md"
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <TimelineContent
            arenaId={selectedTimeline.arenaId}
            pirateIndex={selectedTimeline.pirateIndex}
          />
        </DrawerContent>
      </Drawer>
    ),
    [isOpen, onClose, selectedTimeline.arenaId, selectedTimeline.pirateIndex],
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
      {/* Dynamically load table components based on mode */}
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
      <Collapse in={viewMode}>
        <Box bgColor={colors.blue} p={4}>
          <Button
            leftIcon={<Icon as={FaPenToSquare} />}
            colorScheme="blackAlpha"
            onClick={handleEditModeClick}
          >
            Edit these bets
          </Button>
        </Box>
      </Collapse>

      <Collapse in={!viewMode}>
        <Box
          w="100%"
          py={{ base: 2, md: 2.5 }}
          bg={settingsBg}
          borderBottom="1px solid"
          borderColor={borderColor}
          mb={3}
          position="sticky"
          top="0"
          zIndex="1"
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
          <Flex
            align="center"
            px={5}
            maxW="container.xl"
            mx="auto"
            display={{ base: 'none', md: 'flex' }}
          >
            <TableModes />
            <Box borderRight="1px" borderColor={dividerColor} h="18px" mx={4} />
            <LogitModelToggle />

            <Box borderRight="1px" borderColor={dividerColor} h="18px" mx={4} />
            <CopyDomainToggle />

            <Box borderRight="1px" borderColor={dividerColor} h="18px" mx={4} />
            <Extras />
          </Flex>
        </Box>
        <HorizontalScrollingBox>
          <PirateTable m={4} />
        </HorizontalScrollingBox>
        <BetFunctions />
      </Collapse>

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
