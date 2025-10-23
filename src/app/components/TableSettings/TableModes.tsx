import { HStack, SegmentGroup } from '@chakra-ui/react';
import React, { useCallback, useMemo, useRef } from 'react';
import { FaSquareCaretDown } from 'react-icons/fa6';
import { LuTable } from 'react-icons/lu';
import Cookies from 'universal-cookie';

import { useRoundStore, useTableMode, useSetTableMode } from '../../stores';

interface Option {
  value: string;
  label: React.ReactNode;
}

const TableModes = (): React.ReactElement => {
  const setTableMode = useSetTableMode();
  const tableMode = useTableMode();
  const cookiesRef = useRef(new Cookies());

  // Memoize the options array to prevent re-creation on every render
  const options: Option[] = useMemo(
    () => [
      {
        value: 'normal',
        label: (
          <HStack>
            <LuTable />
            Table
          </HStack>
        ),
      },
      {
        value: 'dropdown',
        label: (
          <HStack>
            <FaSquareCaretDown />
            Dropdown
          </HStack>
        ),
      },
    ],
    [],
  );

  const handleChange = useCallback(
    (value: string): void => {
      // Update state immediately for responsive UI
      setTableMode(value);
      // Set cookie immediately - the main bottleneck is component re-mounting, not this
      cookiesRef.current.set('tableMode', value);
    },
    [setTableMode],
  );

  // Memoize the shared props to prevent re-creation
  const sharedProps = useMemo(
    () => ({
      value: tableMode,
      onValueChange: ({ value }: { value: string }): void => handleChange(value),
    }),
    [tableMode, handleChange],
  );

  return (
    <>
      {/* Mobile view */}
      <SegmentGroup.Root
        {...sharedProps}
        width="100%"
        mb={2}
        display={{ base: 'flex', md: 'none' }}
        data-testid="table-mode-mobile-segmented-control"
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items items={options} />
      </SegmentGroup.Root>

      {/* Desktop view */}
      <SegmentGroup.Root
        {...sharedProps}
        size="sm"
        display={{ base: 'none', md: 'flex' }}
        data-testid="table-mode-desktop-segmented-control"
      >
        <SegmentGroup.Indicator />
        <SegmentGroup.Items items={options} />
      </SegmentGroup.Root>
    </>
  );
};

export default React.memo(TableModes);
