import { Table } from '@chakra-ui/react';
import { describe, it, expect } from 'vitest';

import { render, screen } from '../../../../test/utils';
import Td from '../Td';

describe('Td', () => {
  it('renders children inside a table cell', () => {
    render(
      <Table.Root>
        <Table.Body>
          <Table.Row>
            <Td>Cell Content</Td>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
    );

    const cell = screen.getByText('Cell Content');
    expect(cell).toBeInTheDocument();
    expect(cell.tagName).toBe('TD');
  });

  it('forwards additional props to the underlying Table.Cell', () => {
    render(
      <Table.Root>
        <Table.Body>
          <Table.Row>
            <Td data-testid="custom-td" colSpan={2}>
              Data
            </Td>
          </Table.Row>
        </Table.Body>
      </Table.Root>,
    );

    const cell = screen.getByTestId('custom-td');
    expect(cell).toHaveAttribute('colspan', '2');
  });
});
