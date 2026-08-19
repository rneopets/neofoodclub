import {
  Box,
  Button,
  Dialog,
  Portal,
  CloseButton,
  IconButton,
  CodeBlock,
  createShikiAdapter,
  Badge,
  HStack,
  Icon,
  Stack,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';
import { FaCode } from 'react-icons/fa';
import type { HighlighterGeneric } from 'shiki';

import { defaultRoundData } from '../../constants';
import { useCurrentRound, useRoundStore } from '../../stores';
import RoundInput from '../inputs/RoundInput';

import { RoundData } from '@/types';

// Uses the fine-grained core API (rather than `createHighlighter` from the
// `shiki` package) so the bundler only includes the json language and
// github-dark theme instead of every language/theme shiki ships.
const shikiAdapter = createShikiAdapter<HighlighterGeneric<'json', 'github-dark'>>({
  async load() {
    const [{ createHighlighterCore }, { createOnigurumaEngine }, json, githubDark] =
      await Promise.all([
        import('shiki/core'),
        import('shiki/engine/oniguruma'),
        import('shiki/langs/json.mjs'),
        import('shiki/themes/github-dark.mjs'),
      ]);
    return createHighlighterCore({
      langs: [json.default],
      themes: [githubDark.default],
      engine: createOnigurumaEngine(import('shiki/wasm')),
    }) as Promise<HighlighterGeneric<'json', 'github-dark'>>;
  },
  theme: 'github-dark',
});

interface RoundJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Custom JSON formatter that compacts deep structures on single lines with pretty spacing
const formatJsonWithDepth = (
  obj: unknown,
  maxDepth: number = 2,
  compactKeys: string[] = ['winners'],
): string => {
  const formatCompact = (value: unknown): string => {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
      const items = value.map(item => formatCompact(item));
      return `[${items.join(', ')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>);
    // Move "changes" to the end if it exists
    const changesIndex = entries.findIndex(([key]) => key === 'changes');
    if (changesIndex !== -1) {
      const changesEntry = entries.splice(changesIndex, 1)[0];
      if (changesEntry) {
        entries.push(changesEntry);
      }
    }
    const items = entries.map(([key, val]) => `${JSON.stringify(key)}: ${formatCompact(val)}`);
    return `{${items.join(', ')}}`;
  };

  const formatValue = (
    value: unknown,
    depth: number = 0,
    indent: string = '',
    currentKey: string = '',
  ): string => {
    // For primitives, just stringify them
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value);
    }

    // Special case: if this key should be compacted, format it on one line
    if (compactKeys.includes(currentKey)) {
      return formatCompact(value);
    }

    // If we're at or beyond max depth, compact everything on one line with pretty spacing
    if (depth >= maxDepth) {
      return formatCompact(value);
    }

    const nextIndent = `${indent}  `;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        return '[]';
      }
      const items = value.map(item => formatValue(item, depth + 1, nextIndent, ''));
      return `[\n${nextIndent}${items.join(`,\n${nextIndent}`)}\n${indent}]`;
    }

    // Handle objects
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return '{}';
    }
    // Move "changes" to the end if it exists
    const changesIndex = entries.findIndex(([key]) => key === 'changes');
    if (changesIndex !== -1) {
      const changesEntry = entries.splice(changesIndex, 1)[0];
      if (changesEntry) {
        entries.push(changesEntry);
      }
    }
    const items = entries.map(
      ([key, val]) => `${JSON.stringify(key)}: ${formatValue(val, depth + 1, nextIndent, key)}`,
    );
    return `{\n${nextIndent}${items.join(`,\n${nextIndent}`)}\n${indent}}`;
  };

  return formatValue(obj, 0, '', '');
};

export const RoundJsonModal: React.FC<RoundJsonModalProps> = ({ isOpen, onClose }) => {
  const roundData = useRoundStore(state => state.roundData);
  const currentSelectedRound = useRoundStore(state => state.currentSelectedRound);
  const currentRoundFromCdn = useCurrentRound();

  // The round being previewed in this modal - independent of the globally
  // selected round, so typing here never touches the rest of the page.
  const [previewRound, setPreviewRound] = React.useState(0);
  const [previewData, setPreviewData] = React.useState<RoundData | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(false);
  const [previewError, setPreviewError] = React.useState<string | null>(null);

  // Reset the preview to the live round each time the modal opens. Runs as a
  // layout effect so the reset is committed before the fetch effect below
  // sees `previewRound` in this same pass - otherwise the fetch effect would
  // briefly run once more against the stale (pre-reset) round.
  React.useLayoutEffect(() => {
    if (!isOpen) {
      return;
    }
    setPreviewRound(currentSelectedRound);
    setPreviewData(null);
    setPreviewError(null);
  }, [isOpen, currentSelectedRound]);

  // Fetch the previewed round's JSON directly - bypassing the round store
  // entirely - whenever it differs from the round already loaded globally.
  React.useEffect(() => {
    if (!isOpen || previewRound === 0 || previewRound === roundData.round) {
      // Nothing to fetch - make sure a stale loading/error state from a
      // previous (now-superseded) preview round doesn't linger.
      setPreviewLoading(false);
      setPreviewError(null);
      return;
    }

    const controller = new AbortController();
    setPreviewLoading(true);
    setPreviewError(null);

    fetch(`https://cdn.neofood.club/rounds/${previewRound}.json`, {
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return response.json() as Promise<RoundData>;
      })
      .then(data => {
        setPreviewData(data);
        setPreviewLoading(false);
      })
      .catch(error => {
        if (controller.signal.aborted) {
          return;
        }
        console.error(`Failed to fetch round ${previewRound}:`, error);
        setPreviewError(`Failed to fetch round ${previewRound}`);
        setPreviewLoading(false);
      });

    return (): void => controller.abort();
  }, [isOpen, previewRound, roundData.round]);

  const isPreviewingLoadedRound = previewRound === roundData.round;
  const displayedRoundData = isPreviewingLoadedRound
    ? roundData
    : (previewData ?? defaultRoundData);

  // Pretty-format the JSON with depth limit and special case for winners
  const formattedJson = formatJsonWithDepth(displayedRoundData, 2, ['winners']);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
      size="xl"
      preventScroll
      modal
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <Stack gap={3}>
                <Stack gap={1} align="stretch">
                  <Text fontSize="sm" fontWeight="medium">
                    Change round
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    Current round on Neopets: {currentRoundFromCdn > 0 ? currentRoundFromCdn : '—'}
                  </Text>
                  <RoundInput
                    selectedRound={previewRound}
                    referenceRound={currentRoundFromCdn}
                    onRoundChange={setPreviewRound}
                    hasError={previewError !== null}
                  />
                </Stack>
                <Box minH="300px" opacity={previewLoading ? 0.6 : 1} transition="opacity 0.15s">
                  {previewError ? (
                    <Text fontSize="sm" color="nfc-red.fg">
                      {previewError}
                    </Text>
                  ) : (
                    <CodeBlock.AdapterProvider value={shikiAdapter}>
                      <CodeBlock.Root code={formattedJson} language="json">
                        <CodeBlock.Header>
                          <HStack gap={2} flex={1}>
                            <CodeBlock.Title>
                              <Icon as={FaCode} color="nfc-green.solid" />
                              {displayedRoundData.round || 'unknown'}.json
                            </CodeBlock.Title>
                            <Badge size="sm" colorPalette="nfc-blue">
                              JSON
                            </Badge>
                          </HStack>
                          <CodeBlock.CopyTrigger asChild>
                            <IconButton variant="ghost" size="2xs">
                              <CodeBlock.CopyIndicator />
                            </IconButton>
                          </CodeBlock.CopyTrigger>
                        </CodeBlock.Header>
                        <CodeBlock.Content maxH="calc(100vh - 300px)" overflowY="auto">
                          <CodeBlock.Code>
                            <CodeBlock.CodeText />
                          </CodeBlock.Code>
                        </CodeBlock.Content>
                      </CodeBlock.Root>
                    </CodeBlock.AdapterProvider>
                  )}
                </Box>
              </Stack>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
