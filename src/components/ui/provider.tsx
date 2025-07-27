'use client';

import { ChakraProvider } from '@chakra-ui/react';

import { system } from '../../theme';

import { ColorModeProvider, type ColorModeProviderProps } from './color-mode';

export function Provider(props: ColorModeProviderProps): React.ReactElement {
  return (
    <ChakraProvider value={system}>
      <ColorModeProvider {...props} />
    </ChakraProvider>
  );
}
