import { useEffect, useRef, useState } from 'react';

import { useHasAnyBets } from '../stores';

interface TabPresenceMessage {
  id: string;
  hasBets: boolean;
}

interface TabRegistryEntry {
  hasBets: boolean;
  lastSeen: number;
}

const CHANNEL_NAME = 'neofoodclub-tab-presence';
const HEARTBEAT_INTERVAL_MS = 4000;
const STALE_THRESHOLD_MS = 12000;

/**
 * Tracks whether any OTHER open neofood.club tab currently has bets, using a
 * BroadcastChannel to exchange lightweight presence heartbeats between tabs.
 *
 * This is purely a presence/discovery signal - it does not transfer bet data.
 * The actual bet-set import mechanism lives in DropZone.tsx.
 */
export function useOtherTabHasBets(): boolean {
  const tabIdRef = useRef<string>(crypto.randomUUID());

  const ownHasBets = useHasAnyBets();
  const ownHasBetsRef = useRef(ownHasBets);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const registryRef = useRef<Map<string, TabRegistryEntry>>(new Map());

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

    const recomputeDerivedState = (): void => {
      let hasAny = false;
      for (const entry of registryRef.current.values()) {
        if (entry.hasBets) {
          hasAny = true;
          break;
        }
      }
      setOtherTabHasBets(hasAny);
    };

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

      if (!registryRef.current.has(msg.id)) {
        // A tab we've never seen before - reply immediately so it learns
        // about us right away instead of waiting for our next heartbeat.
        broadcastPresence();
      }

      registryRef.current.set(msg.id, {
        hasBets: msg.hasBets,
        lastSeen: Date.now(),
      });

      recomputeDerivedState();
    };

    // Announce our presence as soon as we're listening.
    broadcastPresence();

    const intervalId = setInterval(() => {
      broadcastPresence();

      const now = Date.now();
      let pruned = false;

      for (const [id, entry] of registryRef.current) {
        if (now - entry.lastSeen > STALE_THRESHOLD_MS) {
          registryRef.current.delete(id);
          pruned = true;
        }
      }

      if (pruned) {
        recomputeDerivedState();
      }
    }, HEARTBEAT_INTERVAL_MS);

    const handleBeforeUnload = (): void => {
      channel.postMessage({
        id: tabIdRef.current,
        hasBets: false,
      } satisfies TabPresenceMessage);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return (): void => {
      clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleBeforeUnload);
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
