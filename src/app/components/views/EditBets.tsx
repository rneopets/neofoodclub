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
} from '@chakra-ui/react';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  Suspense,
  useTransition,
} from 'react';
import { FaPenToSquare, FaGear } from 'react-icons/fa6';

import BetFunctions from '../../BetFunctions';
import { useRoundStore, useViewMode, useTableMode, useHasAnyBets } from '../../stores';
import DropDownTable from '../tables/DropDownTable';
import NormalTable from '../tables/NormalTable';
import CopyDomainToggle from '../TableSettings/CopyDomainToggle';
import Extras from '../TableSettings/Extras';
import LogitModelToggle from '../TableSettings/LogitModelToggle';
import TableModes from '../TableSettings/TableModes';

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
        <Portal container={document.body}>
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

  const isDropdownMode = useMemo(() => tableMode === 'dropdown', [tableMode]);
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
  const setViewMode = useRoundStore(state => state.setViewMode);
  const [isPending, startTransition] = useTransition();
  const [isEditorPrefetched, setIsEditorPrefetched] = useState(false);

  const viewBetAmountsContainerRef = useRef<HTMLDivElement>(null);
  const editBetAmountsContainerRef = useRef<HTMLDivElement>(null);
  const viewPayoutContainerRef = useRef<HTMLDivElement>(null);
  const editPayoutContainerRef = useRef<HTMLDivElement>(null);
  const [betAmountsPortalContainerRef, setBetAmountsPortalContainerRef] =
    useState<React.RefObject<HTMLElement | null> | null>(null);
  const [payoutPortalContainerRef, setPayoutPortalContainerRef] =
    useState<React.RefObject<HTMLElement | null> | null>(null);

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
    let timeoutId: number | null = null;

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

  useLayoutEffect(() => {
    // Ark UI Portal expects a RefObject, not a raw HTMLElement. Passing an element would cause
    // it to fall back to document.body (putting the content after the footer).
    setBetAmountsPortalContainerRef(
      viewMode ? viewBetAmountsContainerRef : editBetAmountsContainerRef,
    );
    setPayoutPortalContainerRef(viewMode ? viewPayoutContainerRef : editPayoutContainerRef);
  }, [viewMode]);

  return (
    <>
      {viewMode && (
        <>
          <Box bgColor={'bg.emphasized'} p={4}>
            <Button colorPalette="blackAlpha" onClick={handleEditModeClick}>
              <FaPenToSquare />
              Edit these bets
            </Button>
          </Box>

          {/* Prefetch the heavy editor table in the background to speed up the click into edit mode */}
          {isEditorPrefetched ? (
            <Box display="none" aria-hidden="true">
              <PirateTable />
            </Box>
          ) : null}

          {/* Portal target for bet amounts while in view mode */}
          <Box ref={viewBetAmountsContainerRef} />
          {/* Portal target for payout UI while in view mode (kept outside the banner for normal flow) */}
          <Box ref={viewPayoutContainerRef} />
        </>
      )}

      {!viewMode && (
        <>
          {/* View / table mode controls (above sidebar + content) */}
          <Box w="full" px={{ base: 4, md: 5, lg: 0 }} mb={0} data-testid="view-controls">
            <Box
              w="100%"
              py={{ base: 2, md: 2.5 }}
              bg={'bg'}
              boxShadow={shadowValue}
              borderRadius={{ base: 'md', lg: 0 }}
            >
              {/* Mobile Layout (will be hidden on md and larger screens) */}
              <Flex direction="column" px={4} py={1} display={{ base: 'flex', md: 'none' }}>
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
              <Flex px={5} py={2} display={{ base: 'none', md: 'flex' }} align="center" gap={4}>
                <HStack gap={2} color="fg.muted">
                  <FaGear size={14} />
                  <Text fontSize="sm" fontWeight="semibold">
                    View
                  </Text>
                </HStack>
                <HStack gap={2}>
                  <TableModes />
                  <LogitModelToggle />
                  <CopyDomainToggle />
                  <Extras />
                </HStack>
              </Flex>
            </Box>
          </Box>

          <Flex
            direction={{ base: 'column', lg: 'row' }}
            align={{ base: 'stretch', lg: 'stretch' }}
            px={{ base: 4, md: 5, lg: 0 }}
            w="full"
            data-testid="bets-layout"
          >
            <Box
              w={{ base: 'full', lg: '360px' }}
              flexShrink={0}
              bg="bg.emphasized"
              borderWidth="1px"
              borderColor="border"
              borderRadius={0}
              p={0}
              // Background + border should extend down the full content height (until the footer),
              // while the inner content remains sticky and scrollable.
              alignSelf={{ lg: 'stretch' }}
              data-testid="bet-sidebar"
            >
              <Box
                position={{ base: 'static', lg: 'sticky' }}
                top={{ lg: '7.5rem' }}
                maxH={{ lg: 'calc(100vh - 8rem)' }}
                overflowX="hidden"
                overflowY={{ base: 'visible', lg: 'auto' }}
                display="flex"
                flexDirection="column"
              >
                <BetFunctions variant="sidebar" flex="1" minH={0} />
              </Box>
            </Box>

            <Box flex="1" minW={0} minH={0} data-testid="bet-main">
              {/* Horizontal scrolling for wide tables, but let the page handle vertical scroll so the sidebar sticky works */}
              <Box overflowX="auto" width="full" pb={4}>
                <PirateTable m={4} />
              </Box>

              {/* Bet amounts should appear below the bet table */}
              <Box ref={editBetAmountsContainerRef} />
              {/* Portal target for payout UI while in edit mode */}
              <Box ref={editPayoutContainerRef} />
            </Box>
          </Flex>
        </>
      )}

      {anyBets && betAmountsPortalContainerRef && (
        <Portal container={betAmountsPortalContainerRef}>
          {isPending ? (
            <Box px={4} py={2} color="fg.muted" fontSize="sm">
              Updating…
            </Box>
          ) : null}
          <Suspense fallback={null}>
            <BetAmountsSettings />
          </Suspense>
        </Portal>
      )}

      {anyBets && payoutPortalContainerRef && (
        <Portal container={payoutPortalContainerRef}>
          <Suspense fallback={null}>
            <ScrollArea.Root width="full">
              <ScrollArea.Viewport>
                <ScrollArea.Content py={4}>
                  <PayoutTable />
                </ScrollArea.Content>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal" />
            </ScrollArea.Root>
          </Suspense>

          <Suspense fallback={null}>
            <ScrollArea.Root width="full">
              <ScrollArea.Viewport>
                <ScrollArea.Content pb={6}>
                  <PayoutCharts />
                </ScrollArea.Content>
              </ScrollArea.Viewport>
              <ScrollArea.Scrollbar orientation="horizontal" />
            </ScrollArea.Root>
          </Suspense>
        </Portal>
      )}
    </>
  );
});
