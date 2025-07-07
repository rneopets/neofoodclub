import { Box, BoxProps } from '@chakra-ui/react';

import { useFaDetails } from '../stores';

// this element will only show children (which are only expected to be food data in the normal table) if they exist and the FA checkbox is checked

const FaDetailsElement = (props: React.ComponentProps<typeof Box>): React.ReactElement | null => {
  const { children, ...rest } = props;

  const faDetails = useFaDetails();

  if (faDetails === false) {
    return null;
  }

  return (
    <Box maxWidth="55px" {...(rest as BoxProps)}>
      {children}
    </Box>
  );
};

export default FaDetailsElement;
