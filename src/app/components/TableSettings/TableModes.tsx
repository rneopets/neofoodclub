import { HStack, SegmentGroup, Text, Spacer, Box } from '@chakra-ui/react';
import React, { useCallback, useMemo, useRef } from 'react';
import { FaSquareCaretDown } from 'react-icons/fa6';
import { LuTable } from 'react-icons/lu';
import Cookies from 'universal-cookie';

import { useTableMode, useSetTableMode } from '../../stores';

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
    <HStack
      display="flex"
      width="100%"
      layerStyle="fill.surface"
      px="2"
      py="2"
      rounded="l1"
      colorPalette="gray"
      mb={2}
    >
      <LuTable />
      <Text>View Mode</Text>
      <Spacer />
      <Box flexShrink={0}>
        <SegmentGroup.Root {...sharedProps} size="sm" data-testid="table-mode-segmented-control">
          <SegmentGroup.Indicator />
          <SegmentGroup.Items items={options} />
        </SegmentGroup.Root>
      </Box>
    </HStack>
  );
};

export default React.memo(TableModes);
