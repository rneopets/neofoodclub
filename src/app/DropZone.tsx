import { useToast } from '@chakra-ui/react';
import React, { useEffect } from 'react';

import { useAddNewSet } from './stores';
import { anyBetsExist, parseBetUrl } from './util';

function removeHtmlTags(str: string): string {
  return str.replace(/<\/?[^>]+(>|$)/g, '');
}

interface DropZoneProps {
  children: React.ReactNode;
}

const DropZone = ({ children }: DropZoneProps): React.ReactElement => {
  const toast = useToast();
  const addNewSet = useAddNewSet();

  useEffect(() => {
    const handleDrop = (e: DragEvent): void => {
      if (!e.dataTransfer) {
        return;
      }

      const url = e.dataTransfer.getData('text/uri-list');
      if (!url) {
        return;
      }

      const hashPart = url.split('#')[1];
      if (!hashPart) {
        return;
      }

      const parsed = parseBetUrl(hashPart);

      if (!anyBetsExist(parsed.bets)) {
        return;
      }

      e.preventDefault();

      const dropped = e.dataTransfer.getData('text/html');
      let name = removeHtmlTags(dropped || '').trim();

      if (name.startsWith('http')) {
        name = `Dropped Set [Round ${parsed.round}]`;
      }

      addNewSet(name, parsed.bets, parsed.betAmounts, true);
      toast({
        title: `Dropped bet imported!`,
        duration: 2000,
        isClosable: true,
      });
    };

    const handleDragOver = (e: DragEvent): void => {
      e.preventDefault();
    };
    document.addEventListener('drop', handleDrop as EventListener);
    document.addEventListener('dragover', handleDragOver as EventListener);

    return (): void => {
      document.removeEventListener('drop', handleDrop as EventListener);
      document.removeEventListener('dragover', handleDragOver as EventListener);
    };
  }, [addNewSet, toast]);

  return <>{children}</>;
};

export default DropZone;
