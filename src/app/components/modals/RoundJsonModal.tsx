import {
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
} from '@chakra-ui/react';
import * as React from 'react';
import { FaCode } from 'react-icons/fa';
import type { BundledLanguage, BundledTheme, HighlighterGeneric } from 'shiki';

import { useRoundStore } from '../../stores';

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

  // Pretty-format the JSON with depth limit and special case for winners
  const formattedJson = formatJsonWithDepth(roundData, 2, ['winners']);

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: { open: boolean }) => !e.open && onClose()}
      size="xl"
      preventScroll
      modal
    >
      <Portal container={document.body}>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <CodeBlock.AdapterProvider value={shikiAdapter}>
                <CodeBlock.Root code={formattedJson} language="json">
                  <CodeBlock.Header>
                    <HStack gap={2} flex={1}>
                      <CodeBlock.Title>
                        <Icon as={FaCode} color="green.300" />
                        {roundData.round || 'unknown'}.json
                      </CodeBlock.Title>
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
