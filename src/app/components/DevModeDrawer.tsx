import {
  Button,
  Drawer,
  Portal,
  Stack,
  CloseButton,
  IconButton,
  Dialog,
  CodeBlock,
  createShikiAdapter,
  Badge,
  HStack,
} from '@chakra-ui/react';
import * as React from 'react';
import { FaCode } from 'react-icons/fa';
import type { BundledLanguage, BundledTheme, HighlighterGeneric } from 'shiki';

import { useRoundDataStore } from '../stores/roundDataStore';

const shikiAdapter = createShikiAdapter<HighlighterGeneric<BundledLanguage, BundledTheme>>({
  async load() {
    const { createHighlighter } = await import('shiki');
    return createHighlighter({
      langs: ['json'],
      themes: ['github-dark'],
    });
  },
  theme: 'github-dark',
});

interface DevModeDrawerProps {
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
    const items = entries.map(
      ([key, val]) => `${JSON.stringify(key)}: ${formatValue(val, depth + 1, nextIndent, key)}`,
    );
    return `{\n${nextIndent}${items.join(`,\n${nextIndent}`)}\n${indent}}`;
  };

  return formatValue(obj, 0, '', '');
};

export const DevModeDrawer: React.FC<DevModeDrawerProps> = ({ isOpen, onClose }) => {
  const roundData = useRoundDataStore(state => state.roundState.roundData);
  const [isJsonModalOpen, setIsJsonModalOpen] = React.useState(false);

  // Pretty-format the JSON with depth limit and special case for winners
  const formattedJson = formatJsonWithDepth(roundData, 2, ['winners']);

  return (
    <>
      <Drawer.Root
        open={isOpen}
        onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
        placement="end"
        size="sm"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner padding={2}>
            <Drawer.Content rounded="md">
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Drawer.CloseTrigger>
              <Drawer.Header>
                <Drawer.Title>Dev Mode</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                <Stack gap={3}>
                  <Button width="full" onClick={() => setIsJsonModalOpen(true)}>
                    <FaCode />
                    View Current Round JSON
                  </Button>
                </Stack>
              </Drawer.Body>
              <Drawer.Footer>
                <Button onClick={onClose} width="full">
                  Close
                </Button>
              </Drawer.Footer>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>

      <Dialog.Root
        open={isJsonModalOpen}
        onOpenChange={(e: { open: boolean }) => setIsJsonModalOpen(e.open)}
        size="xl"
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Round {roundData.round || 'N/A'} JSON</Dialog.Title>
                <Dialog.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Dialog.CloseTrigger>
              </Dialog.Header>
              <Dialog.Body>
                <CodeBlock.AdapterProvider value={shikiAdapter}>
                  <CodeBlock.Root code={formattedJson} language="json">
                    <CodeBlock.Header>
                      <HStack gap={2} flex={1}>
                        <CodeBlock.Title>{roundData.round || 'unknown'}.json</CodeBlock.Title>
                        <Badge size="sm" colorPalette="blue">
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
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setIsJsonModalOpen(false)}>
                  Close
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  );
};
