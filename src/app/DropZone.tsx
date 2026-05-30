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
  const addNewSet = useAddNewSet();

  useEffect(() => {
    const handleDrop = (e: DragEvent): void => {
      if (!e.dataTransfer) {
        return;
      }

      // Get all available data types
      const url = e.dataTransfer.getData('text/uri-list');
      const textPlain = e.dataTransfer.getData('text/plain');
      const textHtml = e.dataTransfer.getData('text/html');

      // Use url first, fall back to textPlain if url is empty
      const sourceUrl = url || textPlain;

      if (!sourceUrl) {
        return;
      }

      // Split by newlines to handle multiple URLs
      const urls = sourceUrl
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && line.includes('#'));

      if (urls.length === 0) {
        return;
      }

      // Prevent default early if we detect URLs with hashes
      // This prevents the browser from navigating
      e.preventDefault();

      // Process each URL
      urls.forEach((urlLine, index) => {
        const hashPart = urlLine.split('#')[1];

        if (!hashPart) {
          return;
        }

        const parsed = parseBetUrl(hashPart);

        if (!anyBetsExist(parsed.bets)) {
          return;
        }

        // For single drops, try to extract name from HTML
        // For multiple drops, use a numbered format
        let name: string;
        if (urls.length === 1) {
          const dropped = textHtml || urlLine;
          name = removeHtmlTags(dropped).trim();
          if (name.startsWith('http')) {
            name = `Dropped Set [Round ${parsed.round}]`;
          }
        } else {
          name = `Dropped Set ${index + 1} [Round ${parsed.round}]`;
        }

        addNewSet(name, parsed.bets, parsed.betAmounts, true);
      });

      // toast({
      //   title: `${importCount} bet${importCount > 1 ? 's' : ''} imported!`,
      //   duration: 2000,
      //   isClosable: true,
      // });
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
  }, [addNewSet]);

  return <>{children}</>;
};

export default DropZone;
