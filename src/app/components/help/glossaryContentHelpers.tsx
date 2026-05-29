import { Text } from '@chakra-ui/react';
import * as React from 'react';

/** Points readers at a glossary entry by term label. */
export function seeGlossary(term: string): React.ReactNode {
  return <> See the Glossary entry for {term}.</>;
}

export const GlossaryFormula: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text
    as="code"
    display="block"
    fontFamily="mono"
    fontSize="xs"
    my="2"
    px="2"
    py="1.5"
    rounded="md"
    bg="bg.muted"
    whiteSpace="pre-wrap"
  >
    {children}
  </Text>
);
