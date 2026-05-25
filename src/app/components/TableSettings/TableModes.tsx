import { HStack } from '@chakra-ui/react';
import React, { useCallback, useMemo, useRef } from 'react';
import { FaSquareCaretDown } from 'react-icons/fa6';
import { LuTable } from 'react-icons/lu';
import Cookies from 'universal-cookie';

import { useTableMode, useSetTableMode } from '../../stores';

import { SegmentedSettingsRow } from './SegmentedSettingsRow';

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

  return (
    <SegmentedSettingsRow
      icon={LuTable}
      label="View Mode"
      value={tableMode}
      options={options}
      onChange={handleChange}
      testId="table-mode-segmented-control"
    />
  );
};

export default React.memo(TableModes);
