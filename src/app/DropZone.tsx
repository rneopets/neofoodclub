import React, { useEffect } from 'react';

import { useAddNewSet } from './stores';
import { anyBetsExist, parseMultiBetUrl } from './util';

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

      // Each line may itself unpack into multiple bets (repeated b=/a= params),
      // so gather every bet across every line before deciding how to number them.
      const lines = urls
        .map(urlLine => {
          const hashPart = urlLine.split('#')[1];
          if (!hashPart) {
            return null;
          }

          const parsed = parseMultiBetUrl(hashPart);
          const entries = parsed.entries.filter(entry => anyBetsExist(entry.bets));

          return { urlLine, round: parsed.round, entries };
        })
        .filter((line): line is NonNullable<typeof line> => line !== null);

      const totalSets = lines.reduce((total, line) => total + line.entries.length, 0);

      let setIndex = 0;
      lines.forEach(line => {
        line.entries.forEach(entry => {
          setIndex += 1;

          // For a single dropped bet, try to extract name from HTML
          // For multiple dropped bets, use a numbered format
          let name: string;
          if (totalSets === 1) {
            const dropped = textHtml || line.urlLine;
            name = removeHtmlTags(dropped).trim();
            if (name.startsWith('http')) {
              name = `Dropped Set [Round ${line.round}]`;
            }
          } else {
            name = `Dropped Set ${setIndex} [Round ${line.round}]`;
          }

          addNewSet(name, entry.bets, entry.betAmounts, true);
        });
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
