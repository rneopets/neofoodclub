import { Box } from '@chakra-ui/react';

import BetAmountsButtons from './BetAmountsButtons';

// these are the "Set all to max" + copy url buttons

const BetAmountsSettings = (): React.ReactElement => (
  <Box p={2} mt={2}>
    <BetAmountsButtons />
  </Box>
);

export default BetAmountsSettings;
