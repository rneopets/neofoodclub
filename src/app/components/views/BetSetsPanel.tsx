import { Box } from '@chakra-ui/react';
import { ReactElement } from 'react';

import BetFunctions from '../../BetFunctions';

type BetSetsPanelVariant = 'sidebar' | 'inline';

interface BetSetsPanelProps {
  variant: BetSetsPanelVariant;
  display?: React.ComponentProps<typeof Box>['display'];
  tableLocation?: 'above' | 'below';
}

export default function BetSetsPanel({
  variant,
  display,
  tableLocation = 'below',
}: BetSetsPanelProps): ReactElement {
  return (
    <Box
      display={display}
      w={variant === 'sidebar' ? { base: 'full', lg: '360px' } : 'full'}
      flexShrink={0}
      bg="bg.emphasized"
      borderWidth="1px"
      borderColor="border"
      borderRadius={0}
      p={0}
      // Background + border should extend down the full content height (until the footer),
      // while the inner content remains sticky and scrollable.
      alignSelf={{ lg: 'stretch' }}
      data-testid={variant === 'sidebar' ? 'bet-sidebar' : 'bet-sets-inline'}
    >
      {variant === 'sidebar' ? (
        <Box
          position={{ base: 'static', lg: 'sticky' }}
          top={{ lg: '7.5rem' }}
          maxH={{ lg: 'calc(100vh - 8rem)' }}
          overflowX="hidden"
          overflowY={{ base: 'visible', lg: 'auto' }}
          display="flex"
          flexDirection="column"
        >
          <BetFunctions variant="sidebar" flex="1" minH={0} />
        </Box>
      ) : (
        <BetFunctions tableLocation={tableLocation} />
      )}
    </Box>
  );
}
