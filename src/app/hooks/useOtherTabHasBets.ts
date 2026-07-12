import { useEffect, useRef, useState } from 'react';

import { useHasAnyBets } from '../stores';

interface TabPresenceMessage {
  id: string;
  hasBets: boolean;
}

const CHANNEL_NAME = 'neofoodclub-tab-presence';

/**
 * Tracks whether any OTHER open neofood.club tab currently has bets, using a
 * BroadcastChannel to exchange lightweight presence messages between tabs.
 *
 * This is a discoverability signal for a "you can drag a bet in" tip, not a
 * live presence indicator: once another tab has been seen with bets, this
 * keeps reporting true even if that tab later closes or goes quiet, since
 * flickering the tip off is worse than showing it a little longer than
 * strictly accurate.
 *
 * This is purely a presence/discovery signal - it does not transfer bet data.
 * The actual bet-set import mechanism lives in DropZone.tsx.
 */
export function useOtherTabHasBets(): boolean {
  const tabIdRef = useRef<string>(crypto.randomUUID());

  const ownHasBets = useHasAnyBets();
  const ownHasBetsRef = useRef(ownHasBets);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const knownTabIdsRef = useRef<Set<string>>(new Set());

  const [otherTabHasBets, setOtherTabHasBets] = useState(false);

  useEffect(() => {
    ownHasBetsRef.current = ownHasBets;
  }, [ownHasBets]);

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return undefined;
    }

    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;

    const broadcastPresence = (): void => {
      channel.postMessage({
        id: tabIdRef.current,
        hasBets: ownHasBetsRef.current,
      } satisfies TabPresenceMessage);
    };

    channel.onmessage = (event: MessageEvent<TabPresenceMessage>): void => {
      const msg = event.data;

      if (!msg || msg.id === tabIdRef.current) {
        return;
      }

      if (!knownTabIdsRef.current.has(msg.id)) {
        knownTabIdsRef.current.add(msg.id);
        // A tab we've never seen before - reply immediately so it learns
        // about us right away instead of waiting to hear from us some other way.
        broadcastPresence();
      }

      if (msg.hasBets) {
        setOtherTabHasBets(true);
      }
    };

    // Announce our presence as soon as we're listening.
    broadcastPresence();

    return (): void => {
      channel.close();
      channelRef.current = null;
    };
    // Intentionally only run this setup once per mount - broadcastPresence
    // always reads the latest bet state via ownHasBetsRef, so no dependency
    // on ownHasBets is needed here.
  }, []);

  useEffect(() => {
    if (channelRef.current === null) {
      return;
    }

    channelRef.current.postMessage({
      id: tabIdRef.current,
      hasBets: ownHasBets,
    } satisfies TabPresenceMessage);
  }, [ownHasBets]);

  return otherTabHasBets;
}
