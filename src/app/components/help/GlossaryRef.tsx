import { Box } from '@chakra-ui/react';
import * as React from 'react';

import { useHelpGuideNavigation } from './HelpGuideNavigationContext';

interface GlossaryRefProps {
  /** Glossary entry `id` from helpGuideContent */
  id: string;
  children: React.ReactNode;
}

const glossaryRefStyles = {
  textDecoration: 'underline dotted',
  textDecorationThickness: '1px',
  textUnderlineOffset: '2px',
} as const;

export const GlossaryRef: React.FC<GlossaryRefProps> = ({ id, children }) => {
  const navigate = useHelpGuideNavigation();

  if (!navigate) {
    return (
      <Box as="span" {...glossaryRefStyles}>
        {children}
      </Box>
    );
  }

  return (
    <Box
      as="button"
      {...glossaryRefStyles}
      cursor="pointer"
      font="inherit"
      color="inherit"
      bg="transparent"
      border="none"
      p="0"
      display="inline"
      onClick={() => navigate(id)}
    >
      {children}
    </Box>
  );
};
