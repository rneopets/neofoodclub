import { Flex, ButtonGroup, Button, Icon, Tooltip } from '@chakra-ui/react';
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
        <ButtonGroup size="md" isAttached width="100%">
          {options.map(option => (
            <Button
              key={option.value}
              leftIcon={<Icon as={option.icon} boxSize="1.2em" />}
              onClick={() => handleChange(option.value)}
              colorScheme={tableMode === option.value ? 'blue' : 'gray'}
              variant={tableMode === option.value ? 'solid' : 'outline'}
              flex="1"
              data-testid={`table-mode-${option.value}-mobile-button`}
            >
              {option.label}
            </Button>
          ))}
        </ButtonGroup>
      </Flex>

      {/* Desktop view */}
      <Tooltip
        label="Pirate Selection Mode"
        openDelay={300}
        display={{ base: 'none', md: 'block' }}
      >
        <ButtonGroup size="sm" isAttached variant="outline" display={{ base: 'none', md: 'flex' }}>
          {options.map(option => (
            <Button
              key={option.value}
              leftIcon={<Icon as={option.icon} boxSize="1em" />}
              onClick={() => handleChange(option.value)}
              colorScheme={tableMode === option.value ? 'blue' : 'gray'}
              variant={tableMode === option.value ? 'solid' : 'outline'}
              data-testid={`table-mode-${option.value}-desktop-button`}
            >
              {option.label}
            </Button>
          ))}
        </ButtonGroup>
      </Tooltip>
    </>
  );
};

export default TableModes;
