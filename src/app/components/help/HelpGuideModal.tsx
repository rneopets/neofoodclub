import {
  Accordion,
  Box,
  Button,
  CloseButton,
  Dialog,
  Portal,
  SegmentGroup,
  Text,
} from '@chakra-ui/react';
import * as React from 'react';

import { HELP_FAQ_ENTRIES, HELP_GLOSSARY_ENTRIES } from '../../constants/helpGuideContent';

import { HelpGuideNavigationProvider } from './HelpGuideNavigationContext';

export type HelpGuideTab = 'glossary' | 'faq';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab: HelpGuideTab;
  initialEntryId?: string;
}

interface HelpAccordionProps {
  entries: { id: string; label: string; body: React.ReactNode }[];
  expandedIds: string[];
  onExpandedChange: (ids: string[]) => void;
}

const HelpAccordion: React.FC<HelpAccordionProps> = ({
  entries,
  expandedIds,
  onExpandedChange,
}) => (
  <Accordion.Root
    collapsible
    multiple
    value={expandedIds}
    onValueChange={({ value }) => onExpandedChange(value)}
  >
    {entries.map(entry => (
      <Accordion.Item key={entry.id} value={entry.id}>
        <Accordion.ItemTrigger py="2">
          <Text fontWeight="medium" fontSize="sm" textAlign="left">
            {entry.label}
          </Text>
          <Accordion.ItemIndicator />
        </Accordion.ItemTrigger>
        <Accordion.ItemContent>
          <Accordion.ItemBody pb="3">
            <Box fontSize="sm" color="fg.muted" lineHeight="tall">
              {entry.body}
            </Box>
          </Accordion.ItemBody>
        </Accordion.ItemContent>
      </Accordion.Item>
    ))}
  </Accordion.Root>
);

const SEGMENT_OPTIONS = [
  { value: 'glossary' as const, label: 'Glossary' },
  { value: 'faq' as const, label: 'FAQs' },
];

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab,
  initialEntryId,
}) => {
  const [tab, setTab] = React.useState<HelpGuideTab>(initialTab);
  const [expandedIds, setExpandedIds] = React.useState<string[]>([]);

  React.useEffect(() => {
    if (isOpen) {
      setTab(initialTab);
      setExpandedIds(initialEntryId ? [initialEntryId] : []);
    }
  }, [isOpen, initialTab, initialEntryId]);

  const navigateToGlossaryEntry = React.useCallback((entryId: string) => {
    setTab('glossary');
    setExpandedIds(prev => (prev.includes(entryId) ? prev : [...prev, entryId]));
  }, []);

  const handleClose = React.useCallback(() => {
    onClose();
  }, [onClose]);

  const glossaryEntries = React.useMemo(
    () =>
      HELP_GLOSSARY_ENTRIES.map(entry => ({
        id: entry.id,
        label: entry.term,
        body: entry.definition,
      })),
    [],
  );

  const faqEntries = React.useMemo(
    () =>
      HELP_FAQ_ENTRIES.map(entry => ({
        id: entry.id,
        label: entry.question,
        body: entry.answer,
      })),
    [],
  );

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(e: { open: boolean }) => !e.open && handleClose()}
      size="lg"
      preventScroll
      modal
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content data-testid="help-guide-modal">
            <Dialog.Header>
              <Dialog.Title>Help guide</Dialog.Title>
              <Dialog.CloseTrigger asChild>
                <CloseButton size="sm" data-testid="help-guide-close" />
              </Dialog.CloseTrigger>
            </Dialog.Header>
            <Dialog.Body>
              <HelpGuideNavigationProvider value={navigateToGlossaryEntry}>
                <SegmentGroup.Root
                  value={tab}
                  onValueChange={({ value }: { value: string | null }) => {
                    if (value === 'glossary' || value === 'faq') {
                      setTab(value);
                    }
                  }}
                  size="sm"
                  mb="3"
                  data-testid="help-guide-tab-switcher"
                >
                  <SegmentGroup.Indicator />
                  <SegmentGroup.Items items={SEGMENT_OPTIONS} />
                </SegmentGroup.Root>
                <Box
                  maxH="420px"
                  overflowY="auto"
                  pr="1"
                  data-testid={tab === 'glossary' ? 'help-guide-glossary' : 'help-guide-faq'}
                >
                  {tab === 'glossary' ? (
                    <HelpAccordion
                      entries={glossaryEntries}
                      expandedIds={expandedIds}
                      onExpandedChange={setExpandedIds}
                    />
                  ) : (
                    <HelpAccordion
                      entries={faqEntries}
                      expandedIds={expandedIds}
                      onExpandedChange={setExpandedIds}
                    />
                  )}
                </Box>
              </HelpGuideNavigationProvider>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
};
