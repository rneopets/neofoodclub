import { Table } from '@chakra-ui/react';

// this element is a chakra <Td> but with less y-padding, to make our tables a little less large

const Td = (props: React.ComponentProps<typeof Table.Cell>): React.ReactElement => (
  <Table.Cell {...props}>{props.children}</Table.Cell>
);

export default Td;
