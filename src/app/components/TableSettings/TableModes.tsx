import { Flex, Button } from '@chakra-ui/react';
import React from 'react';
import { FaTable, FaSquareCaretDown } from 'react-icons/fa6';
import Cookies from 'universal-cookie';

import { useRoundDataStore, useTableMode } from '../../stores';

interface Option {
  value: string;
  label: string;
  icon: React.ElementType;
}

const TableModes = (): React.ReactElement => {
  const setTableMode = useRoundDataStore(state => state.setTableMode);
  const tableMode = useTableMode();
  const cookies = new Cookies();

  const handleChange = (newValue: string): void => {
    cookies.set('tableMode', newValue);
    setTableMode(newValue);
  };

  const options: Option[] = [
    { value: 'normal', label: 'Table', icon: FaTable },
    { value: 'dropdown', label: 'Dropdown', icon: FaSquareCaretDown },
  ];

  return (
    <>
      {/* Mobile view */}
      <Flex width="100%" mb={2} display={{ base: 'flex', md: 'none' }}>
        <Flex width="100%" gap={0}>
          {options.map(option => {
            const IconComponent = option.icon;
            return (
              <Button
                key={option.value}
                onClick={() => handleChange(option.value)}
                colorPalette={tableMode === option.value ? 'blue' : 'gray'}
                variant={tableMode === option.value ? 'solid' : 'outline'}
                flex="1"
                data-testid={`table-mode-${option.value}-mobile-button`}
              >
                <IconComponent style={{ marginRight: '8px', fontSize: '1.2em' }} />
                {option.label}
              </Button>
            );
          })}
        </Flex>
      </Flex>

      {/* Desktop view */}
      <Flex gap={0} display={{ base: 'none', md: 'flex' }}>
        {options.map(option => {
          const IconComponent = option.icon;
          return (
            <Button
              key={option.value}
              onClick={() => handleChange(option.value)}
              colorPalette={tableMode === option.value ? 'blue' : 'gray'}
              variant={tableMode === option.value ? 'solid' : 'outline'}
              size="sm"
              data-testid={`table-mode-${option.value}-desktop-button`}
            >
              <IconComponent style={{ marginRight: '8px', fontSize: '1em' }} />
              {option.label}
            </Button>
          );
        })}
      </Flex>
    </>
  );
};

export default TableModes;
