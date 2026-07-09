import {
  Box,
  Button,
  useDisclosure,
  Drawer,
  Flex,
  HStack,
  CloseButton,
  ScrollArea,
  Text,
  Portal,
  Accordion,
  VStack,
  useBreakpointValue,
} from '@chakra-ui/react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  useTransition,
} from 'react';
import { FaPenToSquare, FaGear } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { BetCopyButtons } from '../../BetFunctions';
import {
  useBetSetPosition,
  useCurrentBet,
  useHasAnyBets,
  useRoundStore,
  useTableMode,
  useViewMode,
} from '../../stores';
import DropDownTable from '../tables/DropDownTable';
import NormalTable from '../tables/NormalTable';
import BetSetPosition from '../TableSettings/BetSetPosition';
import ColorModeToggle from '../TableSettings/ColorModeToggle';
import CopyDomainToggle from '../TableSettings/CopyDomainToggle';
import Extras from '../TableSettings/Extras';
import LogitModelToggle from '../TableSettings/LogitModelToggle';
import TableModes from '../TableSettings/TableModes';

import BetSetsPanel from './BetSetsPanel';

import { useColorModeValue } from '@/components/ui/color-mode';

const BetAmountsSettings = React.lazy(() => import('../bets/BetAmountsSettings'));
const PayoutCharts = React.lazy(() => import('../charts/PayoutCharts'));
const PayoutTable = React.lazy(() => import('../tables/PayoutTable'));
const TimelineContent = React.lazy(() => import('../timeline/TimelineContent'));

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
        preventScroll
        modal
      >
        <Portal>
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
        </Portal>
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

  const isDropdownMode = tableMode === 'dropdown';
  // const isNormalMode = useMemo(() => tableMode === 'normal', [tableMode]);

  return (
    <>
      {isDropdownMode ? (
        <DropDownTable timelineHandlers={timelineHandlers} {...props} />
      ) : (
        <NormalTable timelineHandlers={timelineHandlers} {...props} />
      )}
      {timelineDrawer}
    </>
  );
});

PirateTable.displayName = 'PirateTable';

export default React.memo(function EditBets(): React.ReactElement {
  const viewMode = useViewMode();
  const anyBets = useHasAnyBets();
  const currentBetIndex = useCurrentBet();
  const setViewMode = useRoundStore(state => state.setViewMode);
  const [isPending, startTransition] = useTransition();
  const [isEditorPrefetched, setIsEditorPrefetched] = useState(false);

  // Accordion state persistence with cookies
  const cookies = useMemo(() => new Cookies(), []);
  const [accordionValue, setAccordionValue] = useState<string[]>(() =>
    cookies.get('settingsAccordionExpanded') ? ['settings'] : [],
  );

  const viewBetAmountsContainerRef = useRef<HTMLDivElement>(null);
  const editBetAmountsContainerRef = useRef<HTMLDivElement>(null);
  const viewPayoutContainerRef = useRef<HTMLDivElement>(null);
  const editPayoutContainerRef = useRef<HTMLDivElement>(null);
  const betSetPosition = useBetSetPosition();
  const isLgUp =
    useBreakpointValue({ base: false, lg: true }, { fallback: 'base', ssr: false }) ?? false;

  const shadowValue = useColorModeValue(
    '0 1px 2px rgba(0,0,0,0.02)',
    '0 4px 6px -1px rgba(0,0,0,0.2), 0 2px 4px -1px rgba(0,0,0,0.06)',
  );

  const handleEditModeClick = useCallback(() => {
    // Switch modes in a transition so React can keep the UI responsive while the editor mounts.
    startTransition(() => setViewMode(false));
  }, [setViewMode, startTransition]);

  useEffect(() => {
    // Prefetch/mount the heavy editor table while the user is still in view mode so the click
    // to enter edit mode doesn't pay the full mount cost.
    if (!viewMode || isEditorPrefetched) {
      return;
    }

    // Only worth prefetching when there are bets (since that's when the edit-mode button appears).
    if (!anyBets) {
      return;
    }

    let cancelled = false;
    let idleId: number | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const run = (): void => {
      if (cancelled) {
        return;
      }
      // Use a transition to keep the UI responsive even if the mount is heavy.
      startTransition(() => setIsEditorPrefetched(true));
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleId = (
        window.requestIdleCallback as unknown as (
          cb: () => void,
          opts?: { timeout: number },
        ) => number
      )(run, { timeout: 1200 });
    } else {
      timeoutId = setTimeout(run, 300);
    }

    return (): void => {
      cancelled = true;
      if (idleId !== null && typeof window !== 'undefined' && 'cancelIdleCallback' in window) {
        (window.cancelIdleCallback as unknown as (id: number) => void)(idleId);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  }, [anyBets, isEditorPrefetched, startTransition, viewMode]);

  const isSideBetSetPosition = betSetPosition === 'left' || betSetPosition === 'right';
  const inlineTableLocation = betSetPosition === 'above' ? 'below' : 'above';
  const sideBetSetsPanel = isSideBetSetPosition ? <BetSetsPanel variant="sidebar" /> : null;

  const inlineBetSetsPanel = !isSideBetSetPosition ? (
    <BetSetsPanel variant={isLgUp ? 'inline' : 'sidebar'} tableLocation={inlineTableLocation} />
  ) : null;

  const tablePanel = (
    <Box overflowX="auto" width="full" pb={4}>
      <PirateTable m={4} />
    </Box>
  );

  const tableSection = (
    <>
      {betSetPosition === 'above' ? inlineBetSetsPanel : null}
      {/* Horizontal scrolling for wide tables, but let the page handle vertical scroll so the sidebar sticky works */}
      {tablePanel}
      {betSetPosition === 'below' ? inlineBetSetsPanel : null}
    </>
  );

  const betAmountsContent = anyBets ? (
    <>
      {isPending ? (
        <Box px={4} py={2} color="fg.muted" fontSize="sm">
          Updating…
        </Box>
      ) : null}
      <Suspense fallback={null}>
        <BetAmountsSettings />
      </Suspense>
    </>
  ) : null;

  const payoutContent = anyBets ? (
    <VStack align="stretch" gap={0} w="full">
      <Suspense fallback={null}>
        <>
          <ScrollArea.Root width="full">
            <ScrollArea.Viewport>
              <ScrollArea.Content py={4}>
                <PayoutTable />
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="horizontal" />
          </ScrollArea.Root>
          <ScrollArea.Root width="full">
            <ScrollArea.Viewport>
              <ScrollArea.Content>
                <PayoutCharts />
              </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar orientation="horizontal" />
          </ScrollArea.Root>
        </>
      </Suspense>
    </VStack>
  ) : null;

  const footerSection = (
    <>
      {/* Bet amounts should appear below the bet table */}
      <Box ref={editBetAmountsContainerRef} w="full" />
      <Box ref={editPayoutContainerRef} w="full" />
    </>
  );

  const betsLayout = isSideBetSetPosition ? (
    <Flex
      direction={{ base: 'column', lg: 'row' }}
      align="stretch"
      w="full"
      data-testid="bets-layout"
    >
      {betSetPosition === 'left' && sideBetSetsPanel}
      <Box flex="1" minW={0} minH={0} data-testid="bet-main">
        {tableSection}
        {betSetPosition === 'right' && !isLgUp && sideBetSetsPanel}
        {footerSection}
      </Box>
      {betSetPosition === 'right' && isLgUp && sideBetSetsPanel}
    </Flex>
  ) : (
    <Box w="full" data-testid="bets-layout">
      <Box minW={0} minH={0} data-testid="bet-main">
        {tableSection}
        {footerSection}
      </Box>
    </Box>
  );

  return (
    <>
      {/* Settings accordion - shown in both view mode and edit mode */}
      <Box w="full" mb={0} data-testid="view-controls">
        <Box
          w="100%"
          bg={'bg'}
          boxShadow={shadowValue}
          borderRadius={{ base: 'md', lg: 0 }}
          overflow="visible"
        >
          <Accordion.Root
            collapsible
            variant="subtle"
            px={4}
            py={2}
            value={accordionValue}
            onValueChange={(details: { value: string[] }) => {
              setAccordionValue(details.value);
              cookies.set('settingsAccordionExpanded', details.value.includes('settings'));
            }}
          >
            <Accordion.Item value="settings">
              <Accordion.ItemTrigger
                transition="all 0.2s ease-in-out"
                _hover={{
                  bg: 'bg.emphasized',
                  borderRadius: 'md',
                }}
              >
                <HStack gap={2} flex="1">
                  <FaGear size={14} />
                  <Text fontSize="sm" fontWeight="semibold">
                    Settings
                  </Text>
                </HStack>
                <Accordion.ItemIndicator />
              </Accordion.ItemTrigger>
              <Accordion.ItemContent overflow="visible">
                <Accordion.ItemBody>
                  <VStack gap={2} align="stretch" width="100%">
                    <TableModes />

                    <BetSetPosition />

                    <LogitModelToggle />

                    <CopyDomainToggle />

                    <Extras />

                    <ColorModeToggle />
                  </VStack>
                </Accordion.ItemBody>
              </Accordion.ItemContent>
            </Accordion.Item>
          </Accordion.Root>
        </Box>
      </Box>

      {viewMode && (
        <>
          <Box bgColor={'bg.emphasized'} p={4}>
            <Flex align="center" justify="flex-start" wrap="wrap" gap={4}>
              <Button colorPalette="blackAlpha" onClick={handleEditModeClick}>
                <FaPenToSquare />
                Edit these bets
              </Button>
              {anyBets ? <BetCopyButtons index={currentBetIndex} /> : null}
            </Flex>
          </Box>

          {/* Prefetch the heavy editor table in the background to speed up the click into edit mode */}
          {isEditorPrefetched ? (
            <Box display="none" aria-hidden="true">
              <PirateTable />
            </Box>
          ) : null}

          {/* Portal targets for bet amounts + payout in view mode */}
          <Box ref={viewBetAmountsContainerRef} w="full" />
          <Box ref={viewPayoutContainerRef} w="full" />
        </>
      )}

      {!viewMode && <>{betsLayout}</>}

      {anyBets && (
        <Portal container={viewMode ? viewBetAmountsContainerRef : editBetAmountsContainerRef}>
          {betAmountsContent}
        </Portal>
      )}

      {anyBets && (
        <Portal container={viewMode ? viewPayoutContainerRef : editPayoutContainerRef}>
          {payoutContent}
        </Portal>
      )}
    </>
  );
});
